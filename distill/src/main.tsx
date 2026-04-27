import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useAppStore } from "./store/useAppStore";

// Dev-only: expose store for playwright / browser console testing.
// Not bundled into release because Vite tree-shakes import.meta.env.DEV.
if (import.meta.env.DEV) {
  (window as unknown as { __store: typeof useAppStore }).__store = useAppStore;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
