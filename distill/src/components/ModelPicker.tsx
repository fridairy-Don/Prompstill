import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import type { ModelOption } from "../lib/types";

const BADGES: Record<string, string> = {
  "anthropic/claude-haiku-4.5": "经济",
  "anthropic/claude-sonnet-4.6": "默认",
  "anthropic/claude-opus-4.7": "旗舰",
  "kimi-k2-0905-preview": "国内",
};

function shortLabel(label: string): string {
  // "Claude Sonnet 4.6" -> "Sonnet 4.6"
  return label.replace(/^Claude\s+/i, "");
}

export function ModelPicker() {
  const { model, models, setModel, phase, openMenu, setOpenMenu } =
    useAppStore();
  const ref = useRef<HTMLDivElement>(null);
  const disabled =
    phase === "dissolving" || phase === "streaming" || models.length === 0;
  const open = openMenu === "model";
  const setOpen = (v: boolean) => setOpenMenu(v ? "model" : null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-ink-mute transition-colors hover:text-ink disabled:opacity-50"
      >
        <span>{model ? shortLabel(model.label) : "选模型"}</span>
        <span
          className={`text-[9px] opacity-50 transition-transform ${
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
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-[calc(100%+6px)] left-0 z-30 min-w-[210px] rounded-[12px] border-[2px] border-ink bg-cream-2 p-1 shadow-stamp"
          >
            {models.map((m: ModelOption) => {
              const key = `${m.provider}::${m.id}`;
              const badge = BADGES[m.id];
              const active = model && key === `${model.provider}::${model.id}`;
              return (
                <div
                  key={key}
                  onClick={() => {
                    setModel(m);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-[7px] px-2.5 py-2 text-[12px] font-semibold text-ink transition-colors hover:bg-cream-3 ${
                    active ? "bg-cream-3" : ""
                  }`}
                >
                  <span>{m.label}</span>
                  {badge && (
                    <span className="rounded-full border-[1.5px] border-ink bg-mustard px-2 py-px text-[9px] font-extrabold uppercase tracking-wider text-ink">
                      {badge}
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
