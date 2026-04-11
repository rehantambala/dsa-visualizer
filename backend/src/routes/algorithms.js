const express = require('express');
const { createAlgorithmRun, getAlgorithmRuns } = require('../controllers/algorithmController');

const router = express.Router();

router.get('/', getAlgorithmRuns);
router.post('/', createAlgorithmRun);

module.exports = router;
