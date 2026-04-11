const express = require('express');
const { upsertSession, getSessions } = require('../controllers/sessionController');

const router = express.Router();

router.get('/', getSessions);
router.post('/', upsertSession);

module.exports = router;
