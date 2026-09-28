// backend/src/middleware/csrf.js
//
// Now that the login token lives in an HttpOnly cookie (see authController.js),
// the browser attaches it automatically to same-origin *and* cross-site
// requests alike - which reopens the door to classic CSRF: a malicious page
// could submit a plain HTML <form> to our API and the cookie would ride
// along. Two things close that off together:
//   1. The cookie is set with SameSite=Lax, so it isn't sent on cross-site
//      POST/PUT/PATCH/DELETE at all (only "safe" top-level GET navigations).
//   2. As defense in depth, this middleware requires a custom header on every
//      mutating request. Plain HTML forms cannot set custom headers, and a
//      cross-origin fetch/XHR that tries to would first trigger a CORS
//      preflight - which our origin-locked cors() config in server.js already
//      rejects for any origin other than FRONTEND_ORIGIN.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function requireCsrfHeader(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers["x-requested-with"] !== "dsa-visualizer") {
    return res.status(403).json({ success: false, message: "Missing required request header." });
  }
  next();
}

module.exports = { requireCsrfHeader };
