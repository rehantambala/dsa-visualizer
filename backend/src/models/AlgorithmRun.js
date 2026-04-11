const mongoose = require('mongoose');

const algorithmRunSchema = new mongoose.Schema({
  algorithm: {
    type: String,
    required: true,
    trim: true,
  },
  visualizer: {
    type: String,
    required: true,
    trim: true,
  },
  inputSize: {
    type: Number,
    required: true,
    min: 0,
  },
  steps: {
    type: Number,
    required: true,
    min: 0,
  },
  executionTime: {
    type: Number,
    required: true,
    min: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AlgorithmRun', algorithmRunSchema);
