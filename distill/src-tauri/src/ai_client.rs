use crate::keychain;
use crate::prompts::{system_prompt_resolved, Preset, Provider};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::ipc::Channel;

#[derive(Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    max_tokens: u32,
    stream: bool,
    messages: Vec<ChatMessage<'a>>,
}

#[derive(Serialize)]
struct ChatMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
    #[serde(default)]
    usage: Option<Usage>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatChoiceMessage,
}

#[derive(Deserialize)]
struct ChatChoiceMessage {
    content: String,
}

#[derive(Deserialize, Debug, Clone, Copy)]
pub struct Usage {
    pub prompt_tokens: Option<u32>,
    pub completion_tokens: Option<u32>,
}

pub struct OptimizeResult {
    pub output: String,
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
}

#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum StreamEvent {
    Chunk { content: String },
    Done { input_tokens: Option<u32>, output_tokens: Option<u32> },
    Cancelled,
    Error { message: String },
}

fn build_request(
    client: &reqwest::Client,
    provider: Provider,
    api_key: &str,
    body: &impl Serialize,
) -> reqwest::RequestBuilder {
    let mut req = client.post(provider.endpoint()).bearer_auth(api_key).json(body);
    if matches!(provider, Provider::OpenRouter) {
        req = req
            .header("HTTP-Referer", "https://distill.local")
            .header("X-Title", "Distill");
    }
    req
}

fn classify_status_error(status: reqwest::StatusCode, body: &str, provider: Provider) -> String {
    match status.as_u16() {
        401 | 403 => format!("{:?} 的 API key 无效或权限不足, 请到设置页更新", provider),
        404 => format!("模型在 {:?} 上不可用, 请重新选择: {}", provider, body),
        429 => format!("请求过于频繁({:?}), 请稍后再试", provider),
        500..=599 => format!("{:?} 服务暂时不可用 (HTTP {}), 请稍后重试", provider, status),
        _ => format!("HTTP {} from {:?}: {}", status, provider, body),
    }
}

pub async fn optimize(
    preset: Preset,
    provider: Provider,
    model: &str,
    user_input: &str,
    prompts_dir: Option<&Path>,
) -> Result<OptimizeResult, String> {
    let api_key = keychain::get_key(provider)?
        .ok_or_else(|| format!("尚未配置 {:?} 的 API key, 请到设置页填入", provider))?;

    let system = system_prompt_resolved(preset, prompts_dir);

    let body = ChatRequest {
        model,
        max_tokens: 2048,
        stream: false,
        messages: vec![
            ChatMessage { role: "system", content: &system },
            ChatMessage { role: "user", content: user_input },
        ],
    };

    let client = reqwest::Client::new();
    let resp = build_request(&client, provider, &api_key, &body)
        .send()
        .await
        .map_err(|e| format!("网络错误: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(classify_status_error(status, &text, provider));
    }

    let parsed: ChatResponse = resp.json().await.map_err(|e| format!("解析错误: {e}"))?;
    let choice = parsed
        .choices
        .into_iter()
        .next()
        .ok_or_else(|| "Provider 返回空响应".to_string())?;

    let usage = parsed.usage;
    Ok(OptimizeResult {
        output: choice.message.content,
        input_tokens: usage.as_ref().and_then(|u| u.prompt_tokens),
        output_tokens: usage.as_ref().and_then(|u| u.completion_tokens),
    })
}

pub async fn validate_key(provider: Provider, model: &str) -> Result<(), String> {
    let api_key = keychain::get_key(provider)?
        .ok_or_else(|| "尚未配置 API key".to_string())?;

    let body = ChatRequest {
        model,
        max_tokens: 1,
        stream: false,
        messages: vec![ChatMessage { role: "user", content: "ping" }],
    };

    let client = reqwest::Client::new();
    let resp = build_request(&client, provider, &api_key, &body)
        .send()
        .await
        .map_err(|e| format!("网络错误: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(classify_status_error(status, &text, provider));
    }
    Ok(())
}

pub async fn optimize_stream(
    preset: Preset,
    provider: Provider,
    model: &str,
    user_input: &str,
    prompts_dir: Option<&Path>,
    cancel_flag: Arc<AtomicBool>,
    on_event: Channel<StreamEvent>,
) -> Result<OptimizeResult, String> {
    let api_key = keychain::get_key(provider)?
        .ok_or_else(|| format!("尚未配置 {:?} 的 API key, 请到设置页填入", provider))?;

    let system = system_prompt_resolved(preset, prompts_dir);

    let body = ChatRequest {
        model,
        max_tokens: 2048,
        stream: true,
        messages: vec![
            ChatMessage { role: "system", content: &system },
            ChatMessage { role: "user", content: user_input },
        ],
    };

    let client = reqwest::Client::new();
    let resp = build_request(&client, provider, &api_key, &body)
        .send()
        .await
        .map_err(|e| format!("网络错误: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(classify_status_error(status, &text, provider));
    }

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut full_output = String::new();
    let mut last_usage: Option<Usage> = None;

    'outer: while let Some(chunk_result) = stream.next().await {
        if cancel_flag.load(Ordering::Relaxed) {
            let _ = on_event.send(StreamEvent::Cancelled);
            return Ok(OptimizeResult {
                output: full_output,
                input_tokens: None,
                output_tokens: None,
            });
        }

        let chunk = chunk_result.map_err(|e| format!("流式接收错误: {e}"))?;
        let s = std::str::from_utf8(&chunk).map_err(|e| format!("UTF-8 解码错误: {e}"))?;
        buffer.push_str(s);

        while let Some(idx) = buffer.find('\n') {
            let line = buffer[..idx].trim_end_matches('\r').to_string();
            buffer.drain(..=idx);

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            if let Some(data) = line.strip_prefix("data: ").or_else(|| line.strip_prefix("data:")) {
                let data = data.trim();
                if data == "[DONE]" {
                    break 'outer;
                }
                if data.is_empty() {
                    continue;
                }
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(delta) = parsed["choices"][0]["delta"]["content"].as_str() {
                        if !delta.is_empty() {
                            full_output.push_str(delta);
                            let _ = on_event.send(StreamEvent::Chunk {
                                content: delta.to_string(),
                            });
                        }
                    }
                    if let Some(usage_val) = parsed.get("usage") {
                        if !usage_val.is_null() {
                            if let Ok(u) = serde_json::from_value::<Usage>(usage_val.clone()) {
                                last_usage = Some(u);
                            }
                        }
                    }
                }
            }
        }
    }

    let in_tokens = last_usage.and_then(|u| u.prompt_tokens);
    let out_tokens = last_usage.and_then(|u| u.completion_tokens);
    let _ = on_event.send(StreamEvent::Done {
        input_tokens: in_tokens,
        output_tokens: out_tokens,
    });

    Ok(OptimizeResult {
        output: full_output,
        input_tokens: in_tokens,
        output_tokens: out_tokens,
    })
}
