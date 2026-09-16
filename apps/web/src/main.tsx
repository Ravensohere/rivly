import { createRoot } from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import { KernelProvider } from '@vivly/core';
import App from "./App.tsx";
import "./index.css";
import { recoverFromStaleChunk } from "./lib/chunkReload";

// Recover from stale chunk references after a new deploy. Vite fires
// `vite:preloadError` when a lazily-imported route chunk fails to load
// (old hash no longer on the server) — reload once to pull fresh assets.
window.addEventListener("vite:preloadError", (event) => {
  if (recoverFromStaleChunk()) event.preventDefault();
});

// The service worker precaches the app shell, so a returning user keeps running
// the build they first installed. `skipWaiting` + `clientsClaim` make the new
// worker take over, but the page is still executing the OLD bundle in memory —
// which is how a shipped deploy can stay invisible to existing users for days.
// Reloading when control changes is what actually delivers the new build.
// Only when a controller already exists: on a first-ever install clientsClaim
// fires this too, and reloading a brand-new visitor is pointless churn.
if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    recoverFromStaleChunk();
  });
}

const kernelConfig = {
  apiKey: "vivly_prod_key_xxxxxxxx", // This should be an env var
  environment: "production" as const,
  deviceId: "stable_v1"
};

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <KernelProvider config={kernelConfig}>
      <App />
    </KernelProvider>
  </HelmetProvider>
);
