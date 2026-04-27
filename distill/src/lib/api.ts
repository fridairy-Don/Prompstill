/**
 * Public API surface used by React components.
 *
 * At runtime this dispatches to either:
 *   - Tauri implementation (invoke into Rust commands)
 *   - Web implementation (fetch + localStorage, used in PWA / browser)
 *
 * Components don't need to know which mode they're in.
 */
import { Channel, invoke } from "@tauri-apps/api/core";
import type {
  HistoryItem,
  KeyStatus,
  ModelOption,
  OptimizeOutput,
  Preset,
  Provider,
  StreamEvent,
} from "./types";
import { isTauri } from "./env";
import * as web from "./web-host";

interface RawOptimizeOutput {
  output: string;
  input_tokens?: number;
  output_tokens?: number;
  history_id?: number;
}

function mapOutput(r: RawOptimizeOutput): OptimizeOutput {
  return {
    output: r.output,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    historyId: r.history_id,
  };
}

// ============================================================
// Optimize (streaming)
// ============================================================

export async function optimizePrompt(args: {
  preset: Preset;
  provider: Provider;
  model: string;
  input: string;
}): Promise<OptimizeOutput> {
  if (isTauri()) {
    const r = await invoke<RawOptimizeOutput>("optimize_prompt", args);
    return mapOutput(r);
  }
  return web.webOptimizePrompt(args);
}

export async function optimizePromptStream(
  args: {
    preset: Preset;
    provider: Provider;
    model: string;
    input: string;
  },
  onEvent: (e: StreamEvent) => void,
): Promise<OptimizeOutput> {
  if (isTauri()) {
    const channel = new Channel<StreamEvent>();
    channel.onmessage = onEvent;
    const r = await invoke<RawOptimizeOutput>("optimize_prompt_stream", {
      ...args,
      onEvent: channel,
    });
    return mapOutput(r);
  }
  return web.webOptimizePromptStream(args, onEvent);
}

export function cancelOptimize(): Promise<void> {
  if (isTauri()) {
    return invoke("cancel_optimize");
  }
  web.webCancelOptimize();
  return Promise.resolve();
}

// ============================================================
// API keys
// ============================================================

export function setApiKey(provider: Provider, key: string): Promise<void> {
  if (isTauri()) return invoke("set_api_key", { provider, key });
  web.webSetApiKey(provider, key);
  return Promise.resolve();
}

export function deleteApiKey(provider: Provider): Promise<void> {
  if (isTauri()) return invoke("delete_api_key", { provider });
  web.webDeleteApiKey(provider);
  return Promise.resolve();
}

export function keyStatus(): Promise<KeyStatus> {
  if (isTauri()) return invoke("key_status");
  return Promise.resolve(web.webKeyStatus());
}

export function validateApiKey(
  provider: Provider,
  model: string,
): Promise<void> {
  if (isTauri()) return invoke("validate_api_key", { provider, model });
  return web.webValidateApiKey(provider, model);
}

// ============================================================
// Models / preset metadata
// ============================================================

export function listModels(): Promise<ModelOption[]> {
  if (isTauri()) return invoke("list_models");
  return Promise.resolve(web.webListModels());
}

export function recommendedModel(preset: Preset): Promise<ModelOption> {
  if (isTauri()) return invoke("recommended_model", { preset });
  return Promise.resolve(web.webRecommendedModel(preset));
}

// ============================================================
// History
// ============================================================

export function listHistory(
  limit = 20,
  offset = 0,
): Promise<HistoryItem[]> {
  if (isTauri()) return invoke("list_history", { limit, offset });
  return Promise.resolve(web.webListHistory(limit, offset));
}

export function deleteHistoryItem(id: number): Promise<void> {
  if (isTauri()) return invoke("delete_history_item", { id });
  web.webDeleteHistoryItem(id);
  return Promise.resolve();
}

export function clearHistory(): Promise<void> {
  if (isTauri()) return invoke("clear_history");
  web.webClearHistory();
  return Promise.resolve();
}

// ============================================================
// Prompts (Tauri-only — web has no filesystem)
// ============================================================

export function promptsDir(): Promise<string> {
  if (isTauri()) return invoke("prompts_dir");
  return Promise.resolve("(web 模式 — prompt 内嵌在前端代码中, 编辑 src/lib/web-prompts.ts 后重新部署)");
}

export function openPromptsDir(): Promise<void> {
  if (isTauri()) return invoke("open_prompts_dir");
  return Promise.reject("Web 模式不支持打开本地目录");
}

export function resetDefaultPrompts(): Promise<void> {
  if (isTauri()) return invoke("reset_default_prompts");
  return Promise.reject("Web 模式 prompts 已是内置默认, 无需重置");
}
