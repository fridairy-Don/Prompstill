use crate::ai_client::{self, StreamEvent};
use crate::db::{Db, HistoryItem};
use crate::keychain;
use crate::prompts::{self, ModelOption, Preset, Provider};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::ipc::Channel;
use tauri::State;

pub struct AppState {
    pub cancel_flag: Arc<AtomicBool>,
    pub db: Db,
    pub prompts_dir: PathBuf,
}

#[derive(Serialize)]
pub struct OptimizeOutput {
    pub output: String,
    pub input_tokens: Option<u32>,
    pub output_tokens: Option<u32>,
    pub history_id: Option<i64>,
}

#[derive(Serialize)]
pub struct KeyStatus {
    pub openrouter: bool,
    pub kimi: bool,
}

#[tauri::command]
pub async fn optimize_prompt(
    preset: Preset,
    provider: Provider,
    model: String,
    input: String,
    state: State<'_, AppState>,
) -> Result<OptimizeOutput, String> {
    let prompts_dir = state.prompts_dir.clone();
    let r = ai_client::optimize(preset, provider, &model, &input, Some(&prompts_dir)).await?;

    let preset_str = match preset {
        Preset::Distill => "distill",
        Preset::Code => "code",
        Preset::Product => "product",
    };
    let provider_str = match provider {
        Provider::OpenRouter => "openrouter",
        Provider::Kimi => "kimi",
    };

    let history_id = state
        .db
        .insert_history(
            &input,
            &r.output,
            preset_str,
            provider_str,
            &model,
            r.input_tokens,
            r.output_tokens,
        )
        .ok();

    Ok(OptimizeOutput {
        output: r.output,
        input_tokens: r.input_tokens,
        output_tokens: r.output_tokens,
        history_id,
    })
}

#[tauri::command]
pub async fn optimize_prompt_stream(
    preset: Preset,
    provider: Provider,
    model: String,
    input: String,
    on_event: Channel<StreamEvent>,
    state: State<'_, AppState>,
) -> Result<OptimizeOutput, String> {
    state.cancel_flag.store(false, Ordering::Relaxed);
    let cancel_flag = state.cancel_flag.clone();
    let prompts_dir = state.prompts_dir.clone();

    let result = ai_client::optimize_stream(
        preset,
        provider,
        &model,
        &input,
        Some(&prompts_dir),
        cancel_flag.clone(),
        on_event.clone(),
    )
    .await;

    match result {
        Ok(r) => {
            let was_cancelled = cancel_flag.load(Ordering::Relaxed);
            let history_id = if !was_cancelled && !r.output.is_empty() {
                let preset_str = match preset {
                    Preset::Distill => "distill",
                    Preset::Code => "code",
                    Preset::Product => "product",
                };
                let provider_str = match provider {
                    Provider::OpenRouter => "openrouter",
                    Provider::Kimi => "kimi",
                };
                state
                    .db
                    .insert_history(
                        &input,
                        &r.output,
                        preset_str,
                        provider_str,
                        &model,
                        r.input_tokens,
                        r.output_tokens,
                    )
                    .ok()
            } else {
                None
            };
            Ok(OptimizeOutput {
                output: r.output,
                input_tokens: r.input_tokens,
                output_tokens: r.output_tokens,
                history_id,
            })
        }
        Err(e) => {
            let _ = on_event.send(StreamEvent::Error { message: e.clone() });
            Err(e)
        }
    }
}

#[tauri::command]
pub fn cancel_optimize(state: State<'_, AppState>) {
    state.cancel_flag.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub fn set_api_key(provider: Provider, key: String) -> Result<(), String> {
    keychain::set_key(provider, &key)
}

#[tauri::command]
pub fn delete_api_key(provider: Provider) -> Result<(), String> {
    keychain::delete_key(provider)
}

#[tauri::command]
pub fn key_status() -> KeyStatus {
    KeyStatus {
        openrouter: keychain::has_key(Provider::OpenRouter),
        kimi: keychain::has_key(Provider::Kimi),
    }
}

#[tauri::command]
pub fn list_models() -> Vec<ModelOption> {
    prompts::available_models()
}

#[tauri::command]
pub fn recommended_model(preset: Preset) -> ModelOption {
    prompts::recommended_for(preset)
}

#[tauri::command]
pub async fn validate_api_key(provider: Provider, model: String) -> Result<(), String> {
    ai_client::validate_key(provider, &model).await
}

#[tauri::command]
pub fn list_history(
    state: State<'_, AppState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<HistoryItem>, String> {
    state
        .db
        .list_history(limit.unwrap_or(20), offset.unwrap_or(0))
}

#[tauri::command]
pub fn delete_history_item(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    state.db.delete_history(id)
}

#[tauri::command]
pub fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    state.db.clear_history()
}

#[tauri::command]
pub fn prompts_dir(state: State<'_, AppState>) -> String {
    state.prompts_dir.to_string_lossy().to_string()
}

#[tauri::command]
pub fn open_prompts_dir(state: State<'_, AppState>) -> Result<(), String> {
    prompts::write_defaults_if_missing(&state.prompts_dir)?;
    std::process::Command::new("open")
        .arg(&state.prompts_dir)
        .spawn()
        .map_err(|e| format!("打开目录失败: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn reset_default_prompts(state: State<'_, AppState>) -> Result<(), String> {
    prompts::reset_defaults(&state.prompts_dir)
}
