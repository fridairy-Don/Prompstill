import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "./store/useAppStore";
import { keyStatus, listModels } from "./lib/api";
import { Toolbar } from "./components/Toolbar";
import { InputCard } from "./components/InputCard";
import { OutputCard } from "./components/OutputCard";
import { SettingsPanel } from "./components/SettingsPanel";
import { HistoryList } from "./components/HistoryList";
import "./App.css";

function App() {
  const { view, setView, setModels } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") getCurrentWindow().hide();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document
          .querySelector<HTMLButtonElement>("[data-optimize-btn]")
          ?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    listModels().then(setModels);
    keyStatus().then((s) => {
      if (!s.openrouter && !s.kimi) setView("settings");
    });
  }, [setModels, setView]);

  return (
    <main
      className={`flex h-full flex-col gap-3 overflow-y-auto rounded-xl bg-white/70 p-4 text-neutral-900 backdrop-blur-xl transition-all duration-200 ease-out dark:bg-neutral-900/65 dark:text-neutral-100 ${
        mounted ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
      }`}
    >
      <FadeKey k={view}>
        {view === "main" ? (
          <>
            <header className="flex items-center justify-between">
              <h1 className="text-base font-semibold tracking-tight">Distill</h1>
              <button
                onClick={() => setView("settings")}
                aria-label="设置"
                className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100"
              >
                ⚙
              </button>
            </header>
            <InputCard />
            <Toolbar />
            <OutputCard />
            <HistoryList />
          </>
        ) : (
          <SettingsPanel />
        )}
      </FadeKey>
    </main>
  );
}

function FadeKey({
  k,
  children,
}: {
  k: string;
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [k]);

  return (
    <div
      key={k}
      className={`flex flex-1 flex-col gap-3 transition-all duration-150 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

export default App;
