const mongoose = require('mongoose');

const simulationStateSchema = new mongoose.Schema({
  // Every simulation state must belong to an explicit session - no shared
  // fallback identity. (A 'guest-session' default used to sit here; since
  // `required: true` was also set, the default silently satisfied that
  // requirement and let every unauthenticated caller collide on one shared
  // document. Callers must now always pass a real sessionId.)
  sessionId: {
    type: String,
    required: true,
  },
  dataStructure: { 
    type: String, 
    required: true,
    enum: ['LinkedList', 'Stack', 'Queue', 'Array']
  },
  currentState: { 
    type: Array, 
    required: true,
    default: [] 
  },
  history: {
    type: Array,
    default: []
  },
  lastSavedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

module.exports = mongoose.model('SimulationState', simulationStateSchema);