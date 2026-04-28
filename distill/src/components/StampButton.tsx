import { useAppStore } from "../store/useAppStore";
import {
  cancelOptimize,
  listHistory,
  optimizePromptStream,
} from "../lib/api";

export function StampButton() {
  const {
    preset,
    model,
    input,
    phase,
    setPhase,
    setOutput,
    appendOutput,
    setError,
    setHistory,
  } = useAppStore();

  const busy = phase !== "idle" && phase !== "complete";
  // 允许在 idle 和 complete 两个 "静止" 态点击。complete 态点击 onClick
  // 会先 reset() 再 re-run, 实现"再优化一次"。
  const canClick =
    busy ||
    (!!input.trim() && !!model && (phase === "idle" || phase === "complete"));

  const onClick = async () => {
    if (busy) {
      cancelOptimize().catch(() => {});
      return;
    }
    if (phase === "complete") {
      // Reset and re-run
      useAppStore.getState().reset();
      // wait one frame before starting
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    }
    if (!input.trim() || !model) return;

    setPhase("dissolving");
    setOutput("");
    setError(null);

    // Wait for dissolve animation before swapping to streaming UI
    await new Promise((r) => setTimeout(r, 280));
    setPhase("streaming");

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
      setPhase("complete");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canClick}
      data-optimize-btn
      className={`group relative ml-auto inline-flex items-center gap-1.5 rounded-full border-[2px] border-ink px-4 py-1.5 text-[12px] font-extrabold tracking-[0.01em] transition-all duration-150 ease-out-quart shadow-stamp hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stamp-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:!translate-x-0 disabled:!translate-y-0 disabled:!shadow-stamp ${
        busy ? "bg-mauve text-cream" : "bg-ink text-cream"
      }`}
    >
      <span
        className={`rounded-[4px] px-1.5 py-px text-[10px] font-bold ${
          busy ? "bg-cream text-ink" : "bg-cream text-ink"
        }`}
      >
        {busy ? "中断" : "⌘↵"}
      </span>
      <span>{busy ? "生成中" : "优化"}</span>
    </button>
  );
}
