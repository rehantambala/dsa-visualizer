/**
 * frontend/src/utils/session.js
 *
 * One stable session id per browser, persisted in localStorage. Every visualizer
 * uses this so runs from the same visitor group together server-side (Session
 * model's visualizersUsed / algorithmRuns fields, aggregated by /api/analytics).
 */

const STORAGE_KEY = "dsa-visualizer-session-id";

export function getSessionId() {
  if (typeof window === "undefined") return "server-session";

  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (private mode, etc.) - fall back to a per-load id.
    return `session-${Date.now()}`;
  }
}
