/**
 * Web/PWA implementation of the host API.
 * Mirrors the public surface of `lib/api.ts` but uses fetch + localStorage
 * instead of Tauri invoke + Keychain + SQLite.
 */
import type {
  HistoryItem,
  KeyStatus,
  ModelOption,
  OptimizeOutput,
  Preset,
  Provider,
  StreamEvent,
} from "./types";
import { webSystemPrompt } from "./web-prompts";
import * as storage from "./web-storage";

const ENDPOINT: Record<Provider, string> = {
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  kimi: "https://api.moonshot.cn/v1/chat/completions",
};

// Kept in sync with src-tauri/src/prompts.rs::available_models()
const MODELS: ModelOption[] = [
  { provider: "openrouter", id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 (经济)" },
  { provider: "openrouter", id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  { provider: "openrouter", id: "anthropic/claude-opus-4.7", label: "Claude Opus 4.7 (旗舰)" },
  { provider: "openrouter", id: "openai/gpt-5", label: "GPT-5" },
  { provider: "openrouter", id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { provider: "kimi", id: "kimi-k2-0905-preview", label: "Kimi K2" },
];

const RECOMMENDED: Record<Preset, ModelOption> = {
  distill: { provider: "openrouter", id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  code: { provider: "openrouter", id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  product: { provider: "openrouter", id: "anthropic/claude-opus-4.7", label: "Claude Opus 4.7 (旗舰)" },
};

// In-flight cancel
let _currentAbort: AbortController | null = null;
let _cancelled = false;

function classifyError(status: number, body: string, provider: Provider): string {
  switch (status) {
    case 401:
    case 403:
      return `${provider} 的 API key 无效或权限不足, 请到设置页更新`;
    case 404:
      return `模型在 ${provider} 上不可用, 请重新选择: ${body}`;
    case 429:
      return `请求过于频繁(${provider}), 请稍后再试`;
    case 500:
    case 502:
    case 503:
    case 504:
      return `${provider} 服务暂时不可用 (HTTP ${status}), 请稍后重试`;
    default:
      return `HTTP ${status} from ${provider}: ${body}`;
  }
}

function buildBody(
  preset: Preset,
  provider: Provider,
  model: string,
  userInput: string,
  stream: boolean,
): unknown {
  const systemText = webSystemPrompt(preset);
  const isAnthropic = provider === "openrouter" && model.startsWith("anthropic/");

  // Cache control for Anthropic on OpenRouter (5min ephemeral cache).
  const systemMessage = isAnthropic
    ? {
        role: "system",
        content: [
          { type: "text", text: systemText, cache_control: { type: "ephemeral" } },
        ],
      }
    : { role: "system", content: systemText };

  return {
    model,
    max_tokens: 2048,
    stream,
    messages: [systemMessage, { role: "user", content: userInput }],
  };
}

function buildHeaders(provider: Provider, apiKey: string): Headers {
  const h = new Headers();
  h.set("Content-Type", "application/json");
  h.set("Authorization", `Bearer ${apiKey}`);
  if (provider === "openrouter") {
    h.set("HTTP-Referer", "https://distill.local");
    h.set("X-Title", "Distill");
  }
  return h;
}

export async function webOptimizePrompt(args: {
  preset: Preset;
  provider: Provider;
  model: string;
  input: string;
}): Promise<OptimizeOutput> {
  const apiKey = storage.getKey(args.provider);
  if (!apiKey) {
    throw `尚未配置 ${args.provider} 的 API key, 请到设置页填入`;
  }

  const resp = await fetch(ENDPOINT[args.provider], {
    method: "POST",
    headers: buildHeaders(args.provider, apiKey),
    body: JSON.stringify(buildBody(args.preset, args.provider, args.model, args.input, false)),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw classifyError(resp.status, text, args.provider);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const usage = data.usage;
  const out: OptimizeOutput = {
    output: content,
    inputTokens: usage?.prompt_tokens,
    outputTokens: usage?.completion_tokens,
  };

  // Persist history (mirror Tauri behavior)
  if (content && content.length > 0) {
    const inserted = storage.insertHistoryItem({
      createdAt: Date.now(),
      rawInput: args.input,
      optimizedOutput: content,
      preset: args.preset,
      provider: args.provider,
      model: args.model,
      inputTokens: out.inputTokens,
      outputTokens: out.outputTokens,
    });
    out.historyId = inserted.id;
  }

  return out;
}

export async function webOptimizePromptStream(
  args: {
    preset: Preset;
    provider: Provider;
    model: string;
    input: string;
  },
  onEvent: (e: StreamEvent) => void,
): Promise<OptimizeOutput> {
  const apiKey = storage.getKey(args.provider);
  if (!apiKey) {
    throw `尚未配置 ${args.provider} 的 API key, 请到设置页填入`;
  }

  _cancelled = false;
  _currentAbort = new AbortController();

  const resp = await fetch(ENDPOINT[args.provider], {
    method: "POST",
    headers: buildHeaders(args.provider, apiKey),
    body: JSON.stringify(buildBody(args.preset, args.provider, args.model, args.input, true)),
    signal: _currentAbort.signal,
  }).catch((e) => {
    if (e.name === "AbortError") return null;
    throw `网络错误: ${e.message ?? e}`;
  });

  if (!resp) {
    onEvent({ type: "cancelled" });
    return { output: "" };
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const msg = classifyError(resp.status, text, args.provider);
    onEvent({ type: "error", message: msg });
    throw msg;
  }
  if (!resp.body) {
    throw "Response has no body";
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8"); // Handles UTF-8 across chunk boundaries
  let buffer = "";
  let fullOutput = "";
  let lastUsage: { prompt_tokens?: number; completion_tokens?: number } | null = null;

  try {
    while (true) {
      if (_cancelled) {
        onEvent({ type: "cancelled" });
        try {
          await reader.cancel();
        } catch {
          /* noop */
        }
        return { output: fullOutput };
      }

      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      // eslint-disable-next-line no-cond-assign
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);

        if (!line || line.startsWith(":")) continue;

        const data = line.startsWith("data: ")
          ? line.slice(6).trim()
          : line.startsWith("data:")
          ? line.slice(5).trim()
          : null;
        if (data === null) continue;
        if (data === "[DONE]") {
          break;
        }
        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            fullOutput += delta;
            onEvent({ type: "chunk", content: delta });
          }
          if (parsed.usage) {
            lastUsage = parsed.usage;
          }
        } catch {
          // skip malformed JSON line
        }
      }
    }

    // Flush remaining decoder bytes (no-op typically since stream ended)
    decoder.decode();

    onEvent({
      type: "done",
      input_tokens: lastUsage?.prompt_tokens,
      output_tokens: lastUsage?.completion_tokens,
    });

    const out: OptimizeOutput = {
      output: fullOutput,
      inputTokens: lastUsage?.prompt_tokens,
      outputTokens: lastUsage?.completion_tokens,
    };

    // Persist history
    if (!_cancelled && fullOutput.length > 0) {
      const inserted = storage.insertHistoryItem({
        createdAt: Date.now(),
        rawInput: args.input,
        optimizedOutput: fullOutput,
        preset: args.preset,
        provider: args.provider,
        model: args.model,
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
      });
      out.historyId = inserted.id;
    }

    return out;
  } finally {
    _currentAbort = null;
  }
}

export function webCancelOptimize(): void {
  _cancelled = true;
  if (_currentAbort) {
    try {
      _currentAbort.abort();
    } catch {
      /* noop */
    }
  }
}

export function webSetApiKey(provider: Provider, key: string): void {
  storage.setKey(provider, key);
}

export function webDeleteApiKey(provider: Provider): void {
  storage.deleteKey(provider);
}

export function webKeyStatus(): KeyStatus {
  return {
    openrouter: storage.hasKey("openrouter"),
    kimi: storage.hasKey("kimi"),
  };
}

export function webListModels(): ModelOption[] {
  return MODELS.slice();
}

export function webRecommendedModel(preset: Preset): ModelOption {
  return { ...RECOMMENDED[preset] };
}

export async function webValidateApiKey(
  provider: Provider,
  model: string,
): Promise<void> {
  const apiKey = storage.getKey(provider);
  if (!apiKey) throw "尚未配置 API key";

  const resp = await fetch(ENDPOINT[provider], {
    method: "POST",
    headers: buildHeaders(provider, apiKey),
    body: JSON.stringify({
      model,
      max_tokens: 1,
      stream: false,
      messages: [{ role: "user", content: "ping" }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw classifyError(resp.status, text, provider);
  }
}

export function webListHistory(limit = 20, offset = 0): HistoryItem[] {
  const items = storage.loadHistory();
  return items.slice(offset, offset + limit);
}

export function webDeleteHistoryItem(id: number): void {
  storage.deleteHistoryItem(id);
}

export function webClearHistory(): void {
  storage.clearAllHistory();
}
