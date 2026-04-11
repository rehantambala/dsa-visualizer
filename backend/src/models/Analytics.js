const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  algorithm: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  totalRuns: {
    type: Number,
    default: 0,
    min: 0,
  },
  averageSteps: {
    type: Number,
    default: 0,
    min: 0,
  },
});

module.exports = mongoose.model('Analytics', analyticsSchema);
