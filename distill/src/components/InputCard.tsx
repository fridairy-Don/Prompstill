import { useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";

export function InputCard() {
  const { input, setInput, busy } = useAppStore();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <textarea
      ref={ref}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="把你想说的扔进来…"
      disabled={busy}
      className="h-32 w-full resize-none rounded-lg border border-neutral-200 bg-white/60 p-3 text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-500"
    />
  );
}
