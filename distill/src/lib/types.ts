export type Preset = "distill" | "code" | "product";
export type Provider = "openrouter" | "kimi";

export interface ModelOption {
  provider: Provider;
  id: string;
  label: string;
}

export interface KeyStatus {
  openrouter: boolean;
  kimi: boolean;
}

export interface OptimizeOutput {
  output: string;
  inputTokens?: number;
  outputTokens?: number;
  historyId?: number;
}

export interface HistoryItem {
  id: number;
  createdAt: number;
  rawInput: string;
  optimizedOutput: string;
  preset: Preset;
  provider: Provider;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export type StreamEvent =
  | { type: "chunk"; content: string }
  | { type: "done"; input_tokens?: number; output_tokens?: number }
  | { type: "cancelled" }
  | { type: "error"; message: string };

export const PRESET_LABELS: Record<Preset, string> = {
  distill: "碎碎念",
  code: "代码反馈",
  product: "产品工程",
};

export const PRESET_DESCRIPTIONS: Record<Preset, string> = {
  distill: "通用碎碎念清洗",
  code: "给 AI coding agent 的反馈",
  product: "模糊想法 → 完整产品规格",
};
