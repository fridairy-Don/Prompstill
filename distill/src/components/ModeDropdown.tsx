import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import { PRESET_LABELS, type Preset } from "../lib/types";

interface ModeMeta {
  id: Preset;
  label: string;
  desc: string;
  dotColor: string;
}

const MODES: ModeMeta[] = [
  { id: "distill", label: "碎碎念", desc: "通用清洗 → 清晰 prompt", dotColor: "var(--mauve)" },
  { id: "code", label: "代码反馈", desc: "给 AI coding agent 的反馈", dotColor: "var(--terracotta)" },
  { id: "product", label: "产品工程", desc: "想法 → Vibe Coding spec", dotColor: "var(--lavender)" },
];

const COMING = { id: "coming", label: "情感 / 育儿 / …", desc: "未来更多模式" };

export function ModeDropdown() {
  const { preset, setPreset, phase } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const disabled = phase !== "idle";

  // Click outside to close
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  const current = MODES.find((m) => m.id === preset) ?? MODES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`group inline-flex items-center gap-1.5 rounded-full border-[2px] border-ink px-2.5 py-1 text-[12px] font-bold transition-colors disabled:opacity-50 ${
          open
            ? "bg-ink text-cream"
            : "bg-cream-2 text-ink hover:bg-ink hover:text-cream"
        }`}
      >
        <span
          className="block h-2 w-2 rounded-full transition-shadow"
          style={{
            backgroundColor: current.dotColor,
            boxShadow: open ? "0 0 0 2px var(--cream)" : undefined,
          }}
        />
        <span>{PRESET_LABELS[current.id]}</span>
        <span
          className={`text-[9px] opacity-70 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ transformOrigin: "bottom left" }}
            className="absolute bottom-[calc(100%+8px)] left-0 z-30 min-w-[220px] rounded-[14px] border-[2px] border-ink bg-cream-2 p-1.5 shadow-stamp-lg"
          >
            {MODES.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.2,
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.03 + i * 0.03,
                }}
                onClick={() => {
                  setPreset(m.id);
                  setOpen(false);
                }}
                className={`flex cursor-pointer items-center gap-3 rounded-[9px] px-2.5 py-2 text-[12px] font-semibold text-ink transition-colors hover:bg-cream-3 ${
                  m.id === preset ? "bg-cream-3" : ""
                }`}
              >
                <span
                  className="block h-2.5 w-2.5 flex-shrink-0 rounded-full border-[1.5px] border-ink"
                  style={{ backgroundColor: m.dotColor }}
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-bold">{m.label}</span>
                  <span className="text-[10px] font-medium text-ink-faint">
                    {m.desc}
                  </span>
                </div>
                <span className="w-4 text-right text-[12px] font-extrabold text-ink">
                  {m.id === preset ? "✓" : ""}
                </span>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: [0.34, 1.56, 0.64, 1],
                delay: 0.12,
              }}
              className="flex cursor-not-allowed items-center gap-3 rounded-[9px] px-2.5 py-2 text-[12px] font-semibold text-ink"
            >
              <span className="block h-2.5 w-2.5 flex-shrink-0 rounded-full border-[1.5px] border-ink bg-transparent" />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="font-bold">{COMING.label}</span>
                <span className="text-[10px] font-medium text-ink-faint">
                  {COMING.desc}
                </span>
              </div>
              <span className="w-4 text-right" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
