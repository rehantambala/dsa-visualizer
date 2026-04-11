const AlgorithmRun = require('../models/AlgorithmRun');
const Analytics = require('../models/Analytics');
const Session = require('../models/Session');

const createAlgorithmRun = async (req, res, next) => {
  try {
    const { algorithm, visualizer, inputSize, steps, executionTime, sessionId } = req.body;

    const run = await AlgorithmRun.create({
      algorithm,
      visualizer,
      inputSize,
      steps,
      executionTime,
    });

    const analytics = await Analytics.findOne({ algorithm });

    if (!analytics) {
      await Analytics.create({
        algorithm,
        totalRuns: 1,
        averageSteps: steps,
      });
    } else {
      const totalRuns = analytics.totalRuns + 1;
      const averageSteps = ((analytics.averageSteps * analytics.totalRuns) + steps) / totalRuns;

      analytics.totalRuns = totalRuns;
      analytics.averageSteps = averageSteps;
      await analytics.save();
    }

    if (sessionId) {
      await Session.findOneAndUpdate(
        { sessionId },
        {
          $set: { lastActive: new Date() },
          $inc: { algorithmRuns: 1 },
          $addToSet: { visualizersUsed: visualizer },
          $setOnInsert: { startedAt: new Date() },
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json(run);
  } catch (error) {
    next(error);
  }
};

const getAlgorithmRuns = async (req, res, next) => {
  try {
    const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);

    const runs = await AlgorithmRun.find()
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json(runs);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAlgorithmRun,
  getAlgorithmRuns,
};
