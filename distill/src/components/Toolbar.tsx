import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  cancelOptimize,
  listHistory,
  optimizePromptStream,
  recommendedModel,
} from "../lib/api";
import {
  PRESET_LABELS,
  type ModelOption,
  type Preset,
} from "../lib/types";

const PRESETS: Preset[] = ["distill", "code", "product"];

export function Toolbar() {
  const {
    preset,
    model,
    models,
    input,
    busy,
    setPreset,
    setModel,
    setBusy,
    setOutput,
    appendOutput,
    setError,
    setHistory,
  } = useAppStore();

  useEffect(() => {
    let cancelled = false;
    recommendedModel(preset).then((m) => {
      if (!cancelled) setModel(m);
    });
    return () => {
      cancelled = true;
    };
  }, [preset, setModel]);

  const onOptimize = async () => {
    if (busy) {
      cancelOptimize().catch(() => {});
      return;
    }
    if (!input.trim() || !model) return;
    setBusy(true);
    setError(null);
    setOutput("");
    let cancelled = false;
    try {
      await optimizePromptStream(
        {
          preset,
          provider: model.provider,
          model: model.id,
          input,
        },
        (event) => {
          if (event.type === "chunk") appendOutput(event.content);
          else if (event.type === "cancelled") cancelled = true;
          else if (event.type === "error") setError(event.message);
        },
      );
      if (!cancelled) {
        listHistory().then(setHistory).catch(() => {});
      }
    } catch (e) {
      setError(typeof e === "string" ? e : (e as Error).message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const canOptimize = busy || (!!input.trim() && !!model);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">模式</span>
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as Preset)}
          disabled={busy}
          className="rounded-md border border-neutral-200 bg-white/80 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-100"
        >
          {PRESETS.map((p) => (
            <option key={p} value={p}>
              {PRESET_LABELS[p]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">模型</span>
        <select
          value={model ? `${model.provider}::${model.id}` : ""}
          onChange={(e) => {
            const found = models.find(
              (m) => `${m.provider}::${m.id}` === e.target.value,
            );
            if (found) setModel(found);
          }}
          disabled={busy || models.length === 0}
          className="rounded-md border border-neutral-200 bg-white/80 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-100"
        >
          {models.map((m: ModelOption) => (
            <option key={`${m.provider}::${m.id}`} value={`${m.provider}::${m.id}`}>
              {m.label} ({m.provider})
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={onOptimize}
        disabled={!canOptimize}
        data-optimize-btn
        className={`ml-auto rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          busy
            ? "bg-red-600 text-white hover:bg-red-500"
            : "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        }`}
      >
        {busy ? "中断" : "⌘↵ 优化"}
      </button>
    </div>
  );
}
