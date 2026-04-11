const Session = require('../models/Session');

const upsertSession = async (req, res, next) => {
  try {
    const { sessionId, visualizer } = req.body;

    const now = new Date();

    const update = {
      $set: { lastActive: now },
      $setOnInsert: { startedAt: now, algorithmRuns: 0 },
    };

    if (visualizer) {
      update.$addToSet = { visualizersUsed: visualizer };
    }

    const session = await Session.findOneAndUpdate(
      { sessionId },
      update,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find()
      .sort({ lastActive: -1 })
      .limit(50);

    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upsertSession,
  getSessions,
};
