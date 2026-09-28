const express = require('express');
const router = express.Router();
const { register, login, me, googleAuth, logout } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
