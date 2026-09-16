/**
 * Recovery for stale chunk references after a new deploy.
 *
 * When a new build ships, Vite's hashed chunk filenames change. An already-open
 * tab (or a service-worker-cached index.html) may still reference an old chunk
 * that no longer exists on the server. The server then responds with index.html
 * (MIME text/html) for the missing .js, and the dynamic import fails with
 * "Failed to fetch dynamically imported module".
 *
 * The fix is simply to reload so the browser fetches the fresh index + assets.
 * We time-guard the reload so a genuine outage (where the reload also fails)
 * can't trigger an infinite reload loop.
 */
const RELOAD_KEY = "vivly_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 10_000;

/** Reload once to recover from a stale chunk. Returns true if a reload was triggered. */
export function recoverFromStaleChunk(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode / disabled) — best effort reload once.
  }
  window.location.reload();
  return true;
}

/** Detect errors caused by a failed dynamic import of a stale/renamed chunk. */
export function isChunkLoadError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error || "")).toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("expected a javascript") // MIME mismatch (text/html for a .js chunk)
  );
}
