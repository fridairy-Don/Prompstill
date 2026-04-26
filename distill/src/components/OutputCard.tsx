import { useState } from "react";
import { useAppStore } from "../store/useAppStore";

export function OutputCard() {
  const { output, busy, error, setOutput } = useAppStore();
  const [copied, setCopied] = useState(false);

  if (!output && !busy && !error) return null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white/60 p-3 dark:border-neutral-700 dark:bg-neutral-800/60">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {error ? "错误" : busy && !output ? "生成中…" : "优化结果(可编辑)"}
        </span>
        {output && !error && (
          <button
            onClick={onCopy}
            className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
          >
            {copied ? "已复制 ✓" : "复制"}
          </button>
        )}
      </div>
      {error ? (
        <div className="max-h-64 overflow-auto whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : (
        <textarea
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          spellCheck={false}
          className="block max-h-64 min-h-[6rem] w-full resize-y overflow-auto whitespace-pre-wrap rounded border border-transparent bg-transparent text-sm leading-relaxed text-neutral-900 outline-none focus:border-neutral-300 dark:text-neutral-100 dark:focus:border-neutral-600"
        />
      )}
    </div>
  );
}
