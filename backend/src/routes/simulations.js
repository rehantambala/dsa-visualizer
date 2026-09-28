const express = require('express');
const router = express.Router();
const { saveSimulation, getSimulation } = require('../controllers/simulationController');
const { optionalAuth } = require('../middleware/auth');

// optionalAuth: if the request carries a valid login token, the controller keys
// the save to that account instead of the client-supplied sessionId - so a logged
// in user's saved state is actually private and can't be read/overwritten by
// anyone who happens to guess or reuse the same guest session string.
router.post('/save', optionalAuth, saveSimulation);
router.get('/:sessionId/:dataStructure', optionalAuth, getSimulation);

module.exports = router;