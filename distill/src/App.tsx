import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "./store/useAppStore";
import { keyStatus, listModels } from "./lib/api";
import { MagicBox } from "./components/MagicBox";
import { Toolbar } from "./components/Toolbar";
import { HistoryDrawer, HistoryTrigger } from "./components/HistoryDrawer";
import { SettingsPanel } from "./components/SettingsPanel";
import { TrafficLights } from "./components/TrafficLights";
import "./App.css";

function App() {
  const { setModels, setSettingsOpen, settingsOpen } = useAppStore();

  // ESC closes window (or drawer/settings first); ⌘↵ triggers optimize
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const { drawerOpen, settingsOpen, setDrawerOpen, setSettingsOpen } =
          useAppStore.getState();
        if (drawerOpen) {
          setDrawerOpen(false);
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        getCurrentWindow().hide();
      }
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
      if (!s.openrouter && !s.kimi) setSettingsOpen(true);
    });
  }, [setModels, setSettingsOpen]);

  return (
    <main
      className="app-shell relative h-full overflow-hidden rounded-[16px] border-[2.5px] border-ink animate-app-enter"
    >
      <TrafficLights />

      <button
        onClick={() => setSettingsOpen(!settingsOpen)}
        aria-label="设置"
        className="absolute right-3 top-3 z-[5] grid h-7 w-7 place-items-center rounded-full border-[2px] border-transparent text-[14px] text-ink transition-colors hover:border-ink"
      >
        ⚙
      </button>

      <div className="flex h-full flex-col gap-3.5 px-[18px] pb-[18px] pt-12">
        <MagicBox />
        <Toolbar />
        <HistoryTrigger />
      </div>

      <SettingsPanel />
      <HistoryDrawer />
    </main>
  );
}

export default App;
