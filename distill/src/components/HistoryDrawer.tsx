import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  clearHistory,
  deleteHistoryItem,
  listHistory,
} from "../lib/api";
import { useAppStore } from "../store/useAppStore";
import { PRESET_LABELS, type HistoryItem, type Preset } from "../lib/types";

const PRESET_BG: Record<Preset, string> = {
  distill: "bg-mauve text-cream",
  code: "bg-terracotta text-cream",
  product: "bg-lavender text-ink",
};

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

function HistoryCard({ item }: { item: HistoryItem }) {
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

  const onDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteHistoryItem(item.id);
      removeHistoryItem(item.id);
    } catch (err) {
      console.error(err);
    }
  };

  const colorClass = PRESET_BG[item.preset] ?? PRESET_BG.distill;

  return (
    <div
      onClick={() => setExpandedHistoryId(expanded ? null : item.id)}
      className={`cursor-pointer rounded-[12px] border-[2px] border-ink p-3 shadow-stamp transition-all duration-200 ease-out-quart hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stamp-lg ${colorClass}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex-shrink-0 text-[10px] font-bold tracking-wider opacity-85">
          {relativeTime(item.createdAt)}
        </span>
        <span className="flex-shrink-0 rounded-full border-[1.5px] border-ink bg-cream px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-ink">
          {PRESET_LABELS[item.preset]}
        </span>
      </div>
      <div className="mt-1.5 truncate text-[13px] font-semibold tracking-tight">
        {item.rawInput.slice(0, 60).replace(/\s+/g, " ") || "(空)"}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 border-t-[1.5px] border-ink/30 pt-3">
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest opacity-80">
                  原文
                </div>
                <div className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-[12px] font-medium leading-relaxed">
                  {item.rawInput}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest opacity-80">
                  优化结果
                </div>
                <div className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[12px] font-medium leading-relaxed">
                  {item.optimizedOutput}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(item.optimizedOutput);
                  }}
                  className="rounded-full border-[1.5px] border-ink bg-cream px-2.5 py-1 text-[10px] font-bold text-ink hover:bg-ink hover:text-cream"
                >
                  复制优化版
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(item.rawInput);
                  }}
                  className="rounded-full border-[1.5px] border-ink bg-cream/60 px-2.5 py-1 text-[10px] font-bold text-ink hover:bg-ink hover:text-cream"
                >
                  复制原文
                </button>
                <button
                  onClick={onDelete}
                  className="rounded-full border-[1.5px] border-ink bg-cream/60 px-2.5 py-1 text-[10px] font-bold text-ink hover:bg-mauve hover:text-cream"
                >
                  删除
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HistoryDrawer() {
  const { drawerOpen, setDrawerOpen, history, setHistory } = useAppStore();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (drawerOpen) {
      listHistory().then(setHistory).catch(() => {});
    }
  }, [drawerOpen, setHistory]);

  const onClearAll = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    try {
      await clearHistory();
      setHistory([]);
      setConfirming(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 z-[8]"
            style={{ background: "var(--backdrop)" }}
          />
          <motion.div
            key="drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 left-0 right-0 z-[9] flex h-[80%] flex-col rounded-t-[18px] border-[2px] border-b-0 border-ink bg-cream"
          >
            <div className="flex h-6 flex-shrink-0 items-center justify-center">
              <span className="block h-1 w-9 rounded-full bg-ink" />
            </div>
            <div className="flex flex-shrink-0 items-baseline justify-between px-[18px] pb-2.5">
              <span className="text-[16px] font-extrabold tracking-tight text-ink">
                历史 ✦
              </span>
              <button
                onClick={onClearAll}
                className={`rounded-full border-[2px] border-ink px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                  confirming
                    ? "bg-mauve text-cream"
                    : "bg-transparent text-ink hover:bg-mauve hover:text-cream"
                }`}
              >
                {confirming ? "再点确认" : "清空"}
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto px-3.5 pb-[18px]">
              {history.length === 0 ? (
                <div className="py-8 text-center text-[12px] font-medium text-ink-faint">
                  没有历史。生成第一条优化后会出现在这里。
                </div>
              ) : (
                history.map((h) => <HistoryCard key={h.id} item={h} />)
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function HistoryTrigger() {
  const { drawerOpen, setDrawerOpen, history } = useAppStore();
  return (
    <button
      onClick={() => setDrawerOpen(!drawerOpen)}
      className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-bold tracking-wider text-ink-mute transition-colors hover:text-ink"
    >
      <span
        className={`text-[9px] font-extrabold transition-transform ${
          drawerOpen ? "rotate-180" : ""
        }`}
      >
        ▲
      </span>
      <span>历史</span>
      <span className="rounded-full bg-ink px-2 py-px text-[10px] font-bold text-cream">
        {history.length}
      </span>
    </button>
  );
}
