// backend/src/middleware/validateAlgorithmRun.js
//
// POST /api/algorithms is public (no auth required, by design - logging a run
// shouldn't require an account) and every field in the body is telemetry the
// client is free to make up. Before this validator existed, that telemetry
// was written straight into AlgorithmRun/Analytics/Session with no checks:
// a malicious or buggy client could submit a fake algorithm name, a negative
// or absurdly large inputSize/steps/executionTime, or an oversized sessionId,
// and it would land directly in the database and skew the analytics dashboard
// for everyone.
//
// This only checks shape/range - it does not (and can't) verify that a given
// run's numbers are "truthful" for the algorithm claimed. That's a acceptable
// trust boundary for anonymous learning-analytics telemetry; the point is to
// reject impossible/malformed values, not to re-run the algorithm server-side.

const ALLOWED_VISUALIZERS = new Set([
  'Graph',
  'Binary Tree',
  'Sorting',
  'Pathfinding',
  'Linked List',
  'Stack',
  'Queue',
  'Array',
]);

// Algorithm labels are free text built client-side (e.g. "Inorder traversal",
// "A*", "BST Search") rather than a fixed enum, so we bound length and
// character set instead of an exact allowlist.
const ALGORITHM_NAME_PATTERN = /^[a-zA-Z0-9 *_\-.]{1,60}$/;
const MAX_SESSION_ID_LENGTH = 200;
const MAX_INPUT_SIZE = 100000;
const MAX_STEPS = 1000000;
const MAX_EXECUTION_TIME_MS = 10 * 60 * 1000; // 10 minutes, generously

function isFiniteNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validateAlgorithmRun(req, res, next) {
  const { algorithm, visualizer, inputSize, steps, executionTime, sessionId } = req.body || {};

  if (typeof algorithm !== 'string' || !ALGORITHM_NAME_PATTERN.test(algorithm)) {
    return res.status(400).json({ message: 'Invalid or missing "algorithm" field.' });
  }

  if (typeof visualizer !== 'string' || !ALLOWED_VISUALIZERS.has(visualizer)) {
    return res.status(400).json({ message: 'Invalid or missing "visualizer" field.' });
  }

  if (!isFiniteNonNegativeNumber(inputSize) || inputSize > MAX_INPUT_SIZE) {
    return res.status(400).json({ message: `"inputSize" must be a number between 0 and ${MAX_INPUT_SIZE}.` });
  }

  if (!isFiniteNonNegativeNumber(steps) || steps > MAX_STEPS) {
    return res.status(400).json({ message: `"steps" must be a number between 0 and ${MAX_STEPS}.` });
  }

  if (executionTime !== undefined) {
    if (!isFiniteNonNegativeNumber(executionTime) || executionTime > MAX_EXECUTION_TIME_MS) {
      return res.status(400).json({ message: `"executionTime" must be a number between 0 and ${MAX_EXECUTION_TIME_MS}.` });
    }
  }

  if (sessionId !== undefined) {
    if (typeof sessionId !== 'string' || sessionId.length > MAX_SESSION_ID_LENGTH) {
      return res.status(400).json({ message: `"sessionId" must be a string under ${MAX_SESSION_ID_LENGTH} characters.` });
    }
  }

  next();
}

module.exports = { validateAlgorithmRun };
