const express = require('express');
const { createAlgorithmRun, getAlgorithmRuns } = require('../controllers/algorithmController');
const { validateAlgorithmRun } = require('../middleware/validateAlgorithmRun');

const router = express.Router();

router.get('/', getAlgorithmRuns);
router.post('/', validateAlgorithmRun, createAlgorithmRun);

module.exports = router;
