/**
 * localStorage-backed storage for web/PWA mode.
 *
 * - API keys: localStorage with a `distill.key.<provider>` namespace
 *   (NOT real security — anyone with browser devtools access can read.
 *    For self-use PWA only, do not share the URL with others.)
 * - History: localStorage with `distill.history` key, cap to last 100 items
 * - Settings: localStorage with `distill.settings.*` keys
 */
import type { HistoryItem, Provider } from "./types";

const KEY_PREFIX = "distill.key.";
const HISTORY_KEY = "distill.history";
const HISTORY_LIMIT = 100;

// API keys
export function setKey(provider: Provider, key: string): void {
  localStorage.setItem(KEY_PREFIX + provider, key);
}

export function getKey(provider: Provider): string | null {
  return localStorage.getItem(KEY_PREFIX + provider);
}

export function deleteKey(provider: Provider): void {
  localStorage.removeItem(KEY_PREFIX + provider);
}

export function hasKey(provider: Provider): boolean {
  const v = getKey(provider);
  return !!v && v.length > 0;
}

// History
export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): void {
  // Keep newest first, cap to limit
  const trimmed = items.slice(0, HISTORY_LIMIT);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function insertHistoryItem(item: Omit<HistoryItem, "id">): HistoryItem {
  const items = loadHistory();
  const id = items.length > 0 ? Math.max(...items.map((h) => h.id)) + 1 : 1;
  const full: HistoryItem = { ...item, id };
  items.unshift(full);
  saveHistory(items);
  return full;
}

export function deleteHistoryItem(id: number): void {
  const items = loadHistory().filter((h) => h.id !== id);
  saveHistory(items);
}

export function clearAllHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
