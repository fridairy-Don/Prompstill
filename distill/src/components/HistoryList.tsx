import { useEffect } from "react";
import {
  clearHistory,
  deleteHistoryItem,
  listHistory,
} from "../lib/api";
import { useAppStore } from "../store/useAppStore";
import { PRESET_LABELS, type HistoryItem } from "../lib/types";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(ts).toLocaleDateString();
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const { expandedHistoryId, setExpandedHistoryId, removeHistoryItem } =
    useAppStore();
  const expanded = expandedHistoryId === item.id;

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error(err);
    }
  };

  const onDelete = async () => {
    try {
      await deleteHistoryItem(item.id);
      removeHistoryItem(item.id);
    } catch (err) {
      console.error(err);
    }
  };

  const preview = item.rawInput.slice(0, 50).replace(/\s+/g, " ");

  return (
    <div className="rounded-lg border border-neutral-200 bg-white/50 transition-colors hover:bg-white/70 dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:bg-neutral-800/70">
      <button
        onClick={() => setExpandedHistoryId(expanded ? null : item.id)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {relativeTime(item.createdAt)}
        </span>
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
          {PRESET_LABELS[item.preset]}
        </span>
        <span className="flex-1 truncate text-xs text-neutral-700 dark:text-neutral-300">
          {preview || "(空)"}
        </span>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-200 ease-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2 border-t border-neutral-200 p-3 dark:border-neutral-700">
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                原文
              </div>
              <div className="max-h-32 overflow-auto whitespace-pre-wrap text-xs text-neutral-700 dark:text-neutral-300">
                {item.rawInput}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                优化结果
              </div>
              <div className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-neutral-900 dark:text-neutral-100">
                {item.optimizedOutput}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                {item.model}
              </span>
              <button
                onClick={() => onCopy(item.optimizedOutput)}
                className="ml-auto rounded-md bg-neutral-100 px-2 py-1 text-[11px] text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
              >
                复制优化版
              </button>
              <button
                onClick={() => onCopy(item.rawInput)}
                className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
              >
                复制原文
              </button>
              <button
                onClick={onDelete}
                className="rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HistoryList() {
  const { history, setHistory } = useAppStore();

  useEffect(() => {
    listHistory().then(setHistory).catch(() => {});
  }, [setHistory]);

  const onClearAll = async () => {
    if (!confirm("清空全部历史记录?")) return;
    try {
      await clearHistory();
      setHistory([]);
    } catch (err) {
      console.error(err);
    }
  };

  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          历史记录
        </h2>
        <button
          onClick={onClearAll}
          className="text-[11px] text-neutral-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
        >
          清空
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {history.map((h) => (
          <HistoryRow key={h.id} item={h} />
        ))}
      </div>
    </div>
  );
}
