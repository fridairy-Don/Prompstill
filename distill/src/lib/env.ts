/**
 * Runtime environment detection.
 *
 * Distill ships in two modes:
 *  - Tauri (macOS menubar app) — uses invoke / Keychain / SQLite / Rust SSE
 *  - Web (PWA on iOS / browser) — uses fetch / localStorage / embedded SSE
 */
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window
  );
}

export function isWeb(): boolean {
  return !isTauri();
}
