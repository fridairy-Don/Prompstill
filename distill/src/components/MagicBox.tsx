import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import { renderWithGuesses } from "../lib/render";

/**
 * The unified input + output container — the visual heart of Distill.
 *
 * State machine driven by store.phase:
 *   idle        — textarea editable, placeholder or user text
 *   dissolving  — input fades out + lifts (280ms)
 *   streaming   — output appears char-by-char with cursor
 *   complete    — output editable, copy + reset visible
 */
export function MagicBox() {
  const { input, output, phase, setInput, setOutput, error } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount when idle
  useEffect(() => {
    if (phase === "idle") inputRef.current?.focus();
  }, [phase]);

  const showInput = phase === "idle" || phase === "dissolving";
  const showOutput = phase === "streaming" || phase === "complete";
  const showCursor = phase === "streaming";

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
    <motion.div
      className={`relative flex-1 rounded-[14px] border-[2px] border-ink bg-cream-2 px-6 py-5 transition-all duration-200 ease-out-quart ${
        focused
          ? "-translate-x-0.5 -translate-y-0.5 shadow-stamp-lg"
          : "shadow-none"
      }`}
    >
      {/* Sparkle dingbat — top right inside box */}
      <div className="pointer-events-none absolute right-3 top-2 rotate-[15deg] select-none text-[18px] font-bold text-mustard">
        ✦
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showInput && (
          <motion.textarea
            key="input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="把你想说的扔进来…"
            spellCheck={false}
            disabled={phase !== "idle"}
            initial={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(2px)" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-6 inset-y-5 w-auto h-auto resize-none border-0 outline-none ring-0 bg-transparent text-[16px] leading-[1.55] text-ink placeholder:text-ink-faint placeholder:italic font-medium tracking-[-0.005em] disabled:opacity-100 focus:outline-none focus:ring-0"
          />
        )}

        {showOutput && (
          <motion.div
            key="output"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="absolute inset-x-6 inset-y-5"
          >
            {error ? (
              <div className="text-mauve text-[14px] leading-[1.6] font-medium">
                {error}
              </div>
            ) : phase === "complete" ? (
              <textarea
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                spellCheck={false}
                className="w-full h-full resize-none border-0 outline-none ring-0 bg-transparent text-[16px] leading-[1.55] text-ink font-medium tracking-[-0.005em] focus:outline-none focus:ring-0"
              />
            ) : (
              <div className="w-full h-full overflow-y-auto text-[16px] leading-[1.55] text-ink font-medium tracking-[-0.005em] whitespace-pre-wrap">
                {renderWithGuesses(output, showCursor)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-right action buttons (copy / reset) — only when complete */}
      <AnimatePresence>
        {phase === "complete" && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="absolute right-3 top-3 z-20 flex gap-1.5"
          >
            <button
              onClick={onCopy}
              className={`rounded-full border-[2px] border-ink px-3 py-1 text-[11px] font-bold transition-colors ${
                copied
                  ? "bg-mint text-ink"
                  : "bg-cream text-ink hover:bg-ink hover:text-cream"
              }`}
            >
              {copied ? "已复制 ✓" : "复制"}
            </button>
            <button
              onClick={() => useAppStore.getState().reset()}
              className="rounded-full border-[2px] border-ink bg-cream px-3 py-1 text-[11px] font-bold text-ink transition-colors hover:bg-ink hover:text-cream"
            >
              ↻ 新一条
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
