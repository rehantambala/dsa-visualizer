const AlgorithmRun = require('../models/AlgorithmRun');
const Analytics = require('../models/Analytics');
const Session = require('../models/Session');

const getAnalytics = async (req, res, next) => {
  try {
    const [mostUsedAlgorithms, visualizerUsage, averageSteps] = await Promise.all([
      Analytics.find().sort({ totalRuns: -1, algorithm: 1 }).lean(),
      Session.aggregate([
        { $unwind: '$visualizersUsed' },
        {
          $group: {
            _id: '$visualizersUsed',
            totalSessions: { $sum: 1 },
          },
        },
        { $project: { _id: 0, visualizer: '$_id', totalSessions: 1 } },
        { $sort: { totalSessions: -1, visualizer: 1 } },
      ]),
      AlgorithmRun.aggregate([
        {
          $group: {
            _id: '$algorithm',
            averageSteps: { $avg: '$steps' },
          },
        },
        { $project: { _id: 0, algorithm: '$_id', averageSteps: 1 } },
        { $sort: { averageSteps: -1 } },
      ]),
    ]);

    res.json({
      mostUsedAlgorithms: mostUsedAlgorithms.map((item) => ({
        algorithm: item.algorithm,
        totalRuns: item.totalRuns,
        averageSteps: item.averageSteps,
      })),
      visualizerUsage,
      averageSteps,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
};
