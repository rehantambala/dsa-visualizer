const jwt = require('jsonwebtoken');
const User = require('../models/User');

let googleClient = null;
function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID) return null;
  if (!googleClient) {
    // Lazy require so the app still boots if google-auth-library isn't installed
    // and GOOGLE_CLIENT_ID simply isn't configured (Google login stays disabled).
    const { OAuth2Client } = require('google-auth-library');
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

const TOKEN_COOKIE_NAME = 'token';
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matches JWT expiresIn below

function issueToken(user) {
  return jwt.sign({ id: user._id.toString(), username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

// Sets the login token as an HttpOnly cookie instead of returning it in the
// JSON response body. An HttpOnly cookie is invisible to JavaScript (so an
// XSS bug can't steal it the way it could pull a token out of localStorage);
// SameSite=Lax means it isn't attached to cross-site POST/PUT/etc requests
// either, which is the main CSRF mitigation (see middleware/csrf.js for the
// second layer).
function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE_MS,
    path: '/',
  });
}

// @desc    Create an account
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return res.status(400).json({ success: false, message: 'Username must be 3-24 characters: letters, numbers, underscore.' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ success: false, message: 'That username is already taken.' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ username, passwordHash });

    setAuthCookie(res, issueToken(user));
    res.status(201).json({ success: true, user: { id: user._id, username: user.username } });
  } catch (error) {
    next(error);
  }
};

// @desc    Log in
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const matches = await user.comparePassword(password);
    if (!matches) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    setAuthCookie(res, issueToken(user));
    res.status(200).json({ success: true, user: { id: user._id, username: user.username } });
  } catch (error) {
    next(error);
  }
};

// @desc    Log out - clears the auth cookie
// @route   POST /api/auth/logout
exports.logout = async (_req, res) => {
  res.clearCookie(TOKEN_COOKIE_NAME, { path: '/' });
  res.status(200).json({ success: true });
};

// @desc    Get the current logged-in user from their token
// @route   GET /api/auth/me
exports.me = async (req, res) => {
  // req.user is populated by the requireAuth middleware
  res.status(200).json({ success: true, user: req.user });
};

// @desc    Log in or sign up with a Google ID token from Google Identity Services
// @route   POST /api/auth/google
exports.googleAuth = async (req, res, next) => {
  try {
    const client = getGoogleClient();
    if (!client) {
      return res.status(501).json({
        success: false,
        message: 'Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID to enable it.',
      });
    }

    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Missing Google ID token.' });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Google sign-in.' });
    }

    if (!payload || !payload.sub) {
      return res.status(401).json({ success: false, message: 'Invalid Google sign-in.' });
    }

    let user = await User.findOne({ googleId: payload.sub });

    if (!user) {
      // Google accounts might already have a local username/password account
      // under the same email - link them instead of creating a duplicate.
      if (payload.email) {
        user = await User.findOne({ email: payload.email });
      }
    }

    if (!user) {
      const baseUsername = (payload.email ? payload.email.split('@')[0] : payload.name || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20) || 'user';

      let username = baseUsername;
      let suffix = 0;
      // Keep trying until we find a username that isn't taken.
      // eslint-disable-next-line no-await-in-loop
      while (await User.findOne({ username })) {
        suffix += 1;
        username = `${baseUsername}${suffix}`.slice(0, 24);
      }

      user = await User.create({
        username,
        googleId: payload.sub,
        email: payload.email,
        avatar: payload.picture,
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      user.avatar = user.avatar || payload.picture;
      await user.save();
    }

    setAuthCookie(res, issueToken(user));
    res.status(200).json({
      success: true,
      user: { id: user._id, username: user.username, avatar: user.avatar || null },
    });
  } catch (error) {
    next(error);
  }
};
