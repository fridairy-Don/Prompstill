use crate::keychain;
use crate::prompts::{system_prompt_resolved, Preset, Provider};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock};
use tauri::ipc::Channel;

/// Shared HTTP client (one connection pool for the app's lifetime).
fn shared_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .pool_idle_timeout(std::time::Duration::from_secs(60))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new())
    })
}

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
    content: MessageContent<'a>,
}

/// Either a plain string (OpenAI compat default) or an array of content blocks
/// (Anthropic format, used to attach `cache_control` for prompt caching).
#[derive(Serialize)]
#[serde(untagged)]
enum MessageContent<'a> {
    Text(&'a str),
    Blocks(Vec<ContentBlock<'a>>),
}

#[derive(Serialize)]
struct ContentBlock<'a> {
    #[serde(rename = "type")]
    block_type: &'static str,
    text: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    cache_control: Option<CacheControl>,
}

#[derive(Serialize)]
struct CacheControl {
    #[serde(rename = "type")]
    cache_type: &'static str,
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

/// Build the `messages` array. For Anthropic models on OpenRouter, mark the
/// system prompt as cacheable (5 min TTL). On cache hit OpenRouter charges
/// the cached tokens at ~10% of normal input price.
fn build_messages<'a>(
    provider: Provider,
    model: &str,
    system_prompt: &'a str,
    user_input: &'a str,
) -> Vec<ChatMessage<'a>> {
    let cache_anthropic =
        matches!(provider, Provider::OpenRouter) && model.starts_with("anthropic/");

    let system_content = if cache_anthropic {
        MessageContent::Blocks(vec![ContentBlock {
            block_type: "text",
            text: system_prompt,
            cache_control: Some(CacheControl { cache_type: "ephemeral" }),
        }])
    } else {
        MessageContent::Text(system_prompt)
    };

    vec![
        ChatMessage { role: "system", content: system_content },
        ChatMessage { role: "user", content: MessageContent::Text(user_input) },
    ]
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
        messages: build_messages(provider, model, &system, user_input),
    };

    let resp = build_request(shared_client(), provider, &api_key, &body)
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
        messages: vec![ChatMessage {
            role: "user",
            content: MessageContent::Text("ping"),
        }],
    };

    let resp = build_request(shared_client(), provider, &api_key, &body)
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
        messages: build_messages(provider, model, &system, user_input),
    };

    let resp = build_request(shared_client(), provider, &api_key, &body)
        .send()
        .await
        .map_err(|e| format!("网络错误: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(classify_status_error(status, &text, provider));
    }

    // Buffer raw bytes. We split on '\n' (ASCII 0x0A) which CANNOT appear inside
    // a multi-byte UTF-8 sequence, so it's safe to find newlines without first
    // decoding to a string. Each complete line is a self-contained UTF-8 SSE
    // event, so per-line decoding never splits a multi-byte char.
    let mut byte_buffer: Vec<u8> = Vec::new();
    let mut stream = resp.bytes_stream();
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
        byte_buffer.extend_from_slice(&chunk);

        while let Some(idx) = byte_buffer.iter().position(|&b| b == b'\n') {
            // Drain bytes up to and including the newline.
            let line_with_lf: Vec<u8> = byte_buffer.drain(..=idx).collect();
            // Strip trailing \n and optional \r.
            let mut line_bytes: &[u8] = &line_with_lf[..line_with_lf.len() - 1];
            if line_bytes.last() == Some(&b'\r') {
                line_bytes = &line_bytes[..line_bytes.len() - 1];
            }

            let line = match std::str::from_utf8(line_bytes) {
                Ok(s) => s,
                Err(_) => continue, // malformed line, skip
            };

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            let data = match line
                .strip_prefix("data: ")
                .or_else(|| line.strip_prefix("data:"))
            {
                Some(d) => d.trim(),
                None => continue,
            };

            if data == "[DONE]" {
                break 'outer;
            }
            if data.is_empty() {
                continue;
            }

            let parsed: serde_json::Value = match serde_json::from_str(data) {
                Ok(v) => v,
                Err(_) => continue,
            };

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
