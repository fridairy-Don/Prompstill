import { create } from "zustand";
import type { HistoryItem, ModelOption, Preset } from "../lib/types";

export type Phase = "idle" | "dissolving" | "streaming" | "complete";

interface AppState {
  // Panels (mutually exclusive overlays on top of magic area)
  settingsOpen: boolean;
  drawerOpen: boolean;

  // Core state
  preset: Preset;
  model: ModelOption | null;
  models: ModelOption[];
  input: string;
  output: string;
  phase: Phase;
  error: string | null;
  history: HistoryItem[];
  expandedHistoryId: number | null;

  // Setters
  setSettingsOpen: (b: boolean) => void;
  setDrawerOpen: (b: boolean) => void;
  setPreset: (p: Preset) => void;
  setModel: (m: ModelOption) => void;
  setModels: (m: ModelOption[]) => void;
  setInput: (s: string) => void;
  setOutput: (s: string) => void;
  appendOutput: (chunk: string) => void;
  setPhase: (p: Phase) => void;
  setError: (e: string | null) => void;
  setHistory: (h: HistoryItem[]) => void;
  prependHistory: (h: HistoryItem) => void;
  removeHistoryItem: (id: number) => void;
  setExpandedHistoryId: (id: number | null) => void;

  // Composite
  startOptimize: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  settingsOpen: false,
  drawerOpen: false,

  preset: "distill",
  model: null,
  models: [],
  input: "",
  output: "",
  phase: "idle",
  error: null,
  history: [],
  expandedHistoryId: null,

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setPreset: (preset) => set({ preset }),
  setModel: (model) => set({ model }),
  setModels: (models) => set({ models }),
  setInput: (input) => set({ input }),
  setOutput: (output) => set({ output }),
  appendOutput: (chunk) => set((s) => ({ output: s.output + chunk })),
  setPhase: (phase) => set({ phase }),
  setError: (error) => set({ error }),
  setHistory: (history) => set({ history }),
  prependHistory: (item) => set((s) => ({ history: [item, ...s.history] })),
  removeHistoryItem: (id) =>
    set((s) => ({
      history: s.history.filter((h) => h.id !== id),
      expandedHistoryId:
        s.expandedHistoryId === id ? null : s.expandedHistoryId,
    })),
  setExpandedHistoryId: (expandedHistoryId) => set({ expandedHistoryId }),

  startOptimize: () =>
    set({ phase: "dissolving", output: "", error: null }),
  reset: () => set({ input: "", output: "", error: null, phase: "idle" }),
}));
