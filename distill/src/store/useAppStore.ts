import { create } from "zustand";
import type { HistoryItem, ModelOption, Preset } from "../lib/types";

export type View = "main" | "settings";

interface AppState {
  view: View;
  preset: Preset;
  model: ModelOption | null;
  models: ModelOption[];
  input: string;
  output: string;
  busy: boolean;
  error: string | null;
  history: HistoryItem[];
  expandedHistoryId: number | null;

  setView: (v: View) => void;
  setPreset: (p: Preset) => void;
  setModel: (m: ModelOption) => void;
  setModels: (m: ModelOption[]) => void;
  setInput: (s: string) => void;
  setOutput: (s: string) => void;
  appendOutput: (chunk: string) => void;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
  setHistory: (h: HistoryItem[]) => void;
  prependHistory: (h: HistoryItem) => void;
  removeHistoryItem: (id: number) => void;
  setExpandedHistoryId: (id: number | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "main",
  preset: "distill",
  model: null,
  models: [],
  input: "",
  output: "",
  busy: false,
  error: null,
  history: [],
  expandedHistoryId: null,

  setView: (view) => set({ view }),
  setPreset: (preset) => set({ preset }),
  setModel: (model) => set({ model }),
  setModels: (models) => set({ models }),
  setInput: (input) => set({ input }),
  setOutput: (output) => set({ output }),
  appendOutput: (chunk) =>
    set((s) => ({ output: s.output + chunk })),
  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
  setHistory: (history) => set({ history }),
  prependHistory: (item) =>
    set((s) => ({ history: [item, ...s.history] })),
  removeHistoryItem: (id) =>
    set((s) => ({
      history: s.history.filter((h) => h.id !== id),
      expandedHistoryId: s.expandedHistoryId === id ? null : s.expandedHistoryId,
    })),
  setExpandedHistoryId: (expandedHistoryId) => set({ expandedHistoryId }),
  reset: () => set({ input: "", output: "", error: null }),
}));
