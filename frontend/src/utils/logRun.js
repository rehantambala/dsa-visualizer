/**
 * frontend/src/utils/logRun.js
 *
 * Every visualizer that runs an "algorithm" (sorting, graph traversal, BST ops,
 * pathfinding) should call this once a run completes. It POSTs to /api/algorithms,
 * which both records the run (AlgorithmRun) and rolls it into the Analytics and
 * Session collections server-side - that's what makes the Analytics Dashboard and
 * "most used" stats real instead of permanently empty.
 *
 * Deliberately fire-and-forget: analytics logging must never block or break the
 * visualizer UI if the backend is down or unreachable.
 */

import { api } from "../services/api.js";
import { getSessionId } from "./session.js";

export function logRun({ algorithm, visualizer, inputSize, steps, executionTime = 0 }) {
  try {
    api
      .postAlgorithm({
        algorithm,
        visualizer,
        inputSize,
        steps,
        executionTime,
        sessionId: getSessionId(),
      })
      .catch(() => {
        // Best-effort only.
      });
  } catch {
    // Best-effort only.
  }
}
