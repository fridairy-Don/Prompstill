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

export async function optimizePrompt(args: {
  preset: Preset;
  provider: Provider;
  model: string;
  input: string;
}): Promise<OptimizeOutput> {
  const r = await invoke<RawOptimizeOutput>("optimize_prompt", args);
  return mapOutput(r);
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
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;
  const r = await invoke<RawOptimizeOutput>("optimize_prompt_stream", {
    ...args,
    onEvent: channel,
  });
  return mapOutput(r);
}

export function cancelOptimize(): Promise<void> {
  return invoke("cancel_optimize");
}

export function setApiKey(provider: Provider, key: string): Promise<void> {
  return invoke("set_api_key", { provider, key });
}

export function deleteApiKey(provider: Provider): Promise<void> {
  return invoke("delete_api_key", { provider });
}

export function keyStatus(): Promise<KeyStatus> {
  return invoke("key_status");
}

export function listModels(): Promise<ModelOption[]> {
  return invoke("list_models");
}

export function recommendedModel(preset: Preset): Promise<ModelOption> {
  return invoke("recommended_model", { preset });
}

export function validateApiKey(
  provider: Provider,
  model: string,
): Promise<void> {
  return invoke("validate_api_key", { provider, model });
}

export function listHistory(
  limit = 20,
  offset = 0,
): Promise<HistoryItem[]> {
  return invoke("list_history", { limit, offset });
}

export function deleteHistoryItem(id: number): Promise<void> {
  return invoke("delete_history_item", { id });
}

export function clearHistory(): Promise<void> {
  return invoke("clear_history");
}

export function promptsDir(): Promise<string> {
  return invoke("prompts_dir");
}

export function openPromptsDir(): Promise<void> {
  return invoke("open_prompts_dir");
}

export function resetDefaultPrompts(): Promise<void> {
  return invoke("reset_default_prompts");
}
