const SimulationState = require('../models/SimulationState');

// BUG FIXED: sessionId used to be the literal string "guest-session" for every
// unauthenticated visitor - one shared Mongo document that everyone's browser
// overwrote. resolveSessionId() now prefers the logged-in user's real account id
// (set by optionalAuth) so their save is actually private, and falls back to the
// caller-supplied per-browser session id for guests instead of a shared constant.
function resolveSessionId(req, suppliedSessionId) {
  if (req.user) return `user:${req.user.id}`;
  return suppliedSessionId || 'anonymous-guest';
}
exports.resolveSessionId = resolveSessionId;

// @desc    Save or update the current data structure state
// @route   POST /api/simulations/save
exports.saveSimulation = async (req, res, next) => {
  try {
    const { dataStructure, currentState, history } = req.body;
    const sessionId = resolveSessionId(req, req.body.sessionId);

    let simulation = await SimulationState.findOne({ sessionId, dataStructure });

    if (simulation) {
      simulation.currentState = currentState;
      simulation.history = history;
      simulation.lastSavedAt = Date.now();
      await simulation.save();
    } else {
      simulation = await SimulationState.create({
        sessionId,
        dataStructure,
        currentState,
        history
      });
    }

    res.status(200).json({ success: true, data: simulation });
  } catch (error) {
    console.error("Save Simulation Error:", error);
    next(error); // Passes to your existing errorHandler.js
  }
};

// @desc    Get the saved state to restore the UI
// @route   GET /api/simulations/:sessionId/:dataStructure
exports.getSimulation = async (req, res, next) => {
  try {
    const { dataStructure } = req.params;
    const sessionId = resolveSessionId(req, req.params.sessionId);
    const simulation = await SimulationState.findOne({ sessionId, dataStructure });

    if (!simulation) {
      return res.status(404).json({ success: false, message: 'No saved state found' });
    }

    res.status(200).json({ success: true, data: simulation });
  } catch (error) {
    console.error("Get Simulation Error:", error);
    next(error);
  }
};