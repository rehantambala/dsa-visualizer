const jwt = require('jsonwebtoken');

// The login token now lives in an HttpOnly cookie set by authController.js
// (previously it was read from an `Authorization: Bearer` header, which
// required storing the token in localStorage on the frontend - readable by
// any injected script if an XSS vulnerability ever existed). An HttpOnly
// cookie can't be read by JavaScript at all, so it isn't exposed to XSS.
function getTokenFromRequest(req) {
  return (req.cookies && req.cookies.token) || null;
}

// Attaches req.user when a valid token is present, but never rejects the request -
// most routes (like save/load simulation) should work for guests too. Routes that
// truly require login use `requireAuth` below instead.
function optionalAuth(req, _res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
  } catch {
    // Invalid/expired token - treat as a guest rather than erroring the request.
  }
  next();
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ success: false, message: 'Login required' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = { optionalAuth, requireAuth };
