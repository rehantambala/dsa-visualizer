const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  visualizersUsed: {
    type: [String],
    default: [],
  },
  algorithmRuns: {
    type: Number,
    default: 0,
    min: 0,
  },
});

module.exports = mongoose.model('Session', sessionSchema);
