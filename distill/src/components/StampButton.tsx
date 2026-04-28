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
    output,
    phase,
    setInput,
    setPhase,
    setOutput,
    appendOutput,
    setError,
    setHistory,
  } = useAppStore();

  const busy = phase !== "idle" && phase !== "complete";

  // 完成态下 textarea 绑定的是 `output` 字段, 用户编辑的是 output, 不是 input。
  // 所以"再优化一次"时, 实际要送给 LLM 的是当前 output 的内容(可能被用户改过),
  // 而不是 store 里那份永远停在第一次的 input。
  const textInBox = phase === "complete" ? output : input;
  const canClick =
    busy ||
    (!!textInBox.trim() &&
      !!model &&
      (phase === "idle" || phase === "complete"));

  const onClick = async () => {
    if (busy) {
      cancelOptimize().catch(() => {});
      return;
    }

    // 抓"用户当前看到框里的文字"作为本次要优化的内容。
    // - idle: 就是 input
    // - complete: 是 output (因为 UI 把 output 渲染成可编辑 textarea)
    const textToOptimize = phase === "complete" ? output : input;
    if (!textToOptimize.trim() || !model) return;

    if (phase === "complete") {
      // 把用户编辑过的文本提升为新 input, 清空 output, 回到可流式渲染的状态。
      setInput(textToOptimize);
      useAppStore.getState().reset();
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    }

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
          // 直接用本地变量, 不依赖闭包里的 input (setInput 是异步, 闭包看不到新值)
          input: textToOptimize,
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
