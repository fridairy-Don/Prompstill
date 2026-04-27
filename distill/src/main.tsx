import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useAppStore } from "./store/useAppStore";
import { isWeb } from "./lib/env";

// Mark <html> for CSS branching (web-mode adds cream body bg + safe-area padding)
if (isWeb()) {
  document.documentElement.classList.add("web-mode");
}

// Dev-only: expose store for playwright / browser console testing.
// Not bundled into release because Vite tree-shakes import.meta.env.DEV.
if (import.meta.env.DEV) {
  (window as unknown as { __store: typeof useAppStore }).__store = useAppStore;
}

// PWA: register service worker (web only — Tauri webview has its own model)
if (isWeb() && "serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("SW register failed", err));
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
