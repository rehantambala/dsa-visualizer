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

    // Atomic upsert via an aggregation-pipeline update instead of the previous
    // findOne() -> mutate in JS -> save() pattern. That read-modify-write had a
    // race: two concurrent runs for the same algorithm could both read the same
    // totalRuns/averageSteps, and whichever save() landed second would silently
    // clobber the other's increment - losing a run count and corrupting the
    // running average. Computing totalRuns/averageSteps inside the update
    // pipeline means MongoDB applies the whole read+compute+write atomically
    // per document, so concurrent posts can no longer stomp on each other.
    await Analytics.findOneAndUpdate(
      { algorithm },
      [
        {
          $set: {
            totalRuns: { $add: [{ $ifNull: ['$totalRuns', 0] }, 1] },
            averageSteps: {
              $divide: [
                {
                  $add: [
                    { $multiply: [{ $ifNull: ['$averageSteps', 0] }, { $ifNull: ['$totalRuns', 0] }] },
                    steps,
                  ],
                },
                { $add: [{ $ifNull: ['$totalRuns', 0] }, 1] },
              ],
            },
          },
        },
      ],
      { upsert: true }
    );

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
