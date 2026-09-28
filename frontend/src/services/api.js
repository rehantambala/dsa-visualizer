// PRODUCTION TOPOLOGY: the auth cookie is set with SameSite=Lax (see
// backend/src/controllers/authController.js), which browsers never attach to
// a cross-SITE fetch/XHR - only to same-site requests and top-level GET
// navigations. Calling the Render backend's own origin directly from the
// Vercel-hosted frontend would be cross-site, so every authenticated request
// would silently drop the cookie (login would appear to work, then every
// follow-up call - including session restore on refresh - would look logged
// out). frontend/vercel.json rewrites `/api/*` to the backend at Vercel's
// edge, so from the browser's point of view the request never leaves the
// frontend's own origin - same-site, cookie included, no CORS preflight
// needed either. That's why this defaults to a relative path ('') in a
// production build instead of an absolute backend URL. Only set
// VITE_API_BASE_URL if you deploy the frontend somewhere without that proxy
// rewrite in front of it, and switch the backend cookie to
// SameSite=None; Secure to match.
const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000');

// The login token lives in an HttpOnly cookie now (not in JS-readable storage -
// see utils/auth.js), so there's no token to attach manually. `credentials:
// 'include'` makes the browser send/accept that cookie on cross-port requests
// during local dev (and cross-subdomain in production). The custom header is
// required by the backend's CSRF guard (backend/src/middleware/csrf.js) on
// every mutating request - see that file for why a custom header stops CSRF.
// Every failure is an ApiError so the UI can tell them apart:
//   kind 'unauthorized' - 401 (wrong credentials / expired session)
//   kind 'server'       - any other non-2xx; `message` is the server's own text
//   kind 'network'      - fetch itself threw (backend down, offline, CORS); status 0
export class ApiError extends Error {
  constructor(message, { kind, status }) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'dsa-visualizer',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (err) {
    throw new ApiError(err?.message || 'Network request failed', { kind: 'network', status: 0 });
  }
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const message = body?.message || `Request failed: ${path}`;
    throw new ApiError(message, { kind: res.status === 401 ? 'unauthorized' : 'server', status: res.status });
  }
  return body;
}

// NOTE: only methods with a matching backend route belong here. This used to also
// export getSessions/postSession/postAnalytics, but the backend has no /api/sessions
// route and /api/analytics only supports GET - those calls would have 404ed at runtime.
// Session tracking currently happens server-side as a side effect of POST /api/algorithms
// (see backend/src/controllers/algorithmController.js), so there's no separate endpoint to call yet.
export const api = {
  getAlgorithms: () => request('/api/algorithms'),
  postAlgorithm: (payload) => request('/api/algorithms', { method: 'POST', body: JSON.stringify(payload) }),
  getAnalytics: () => request('/api/analytics'),
  register: (username, password) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  googleLogin: (idToken) => request('/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
};

// Shared fetch options for components (like LinkedListVisualizer.jsx) that
// make direct fetch() calls outside this api client instead of through
// request() above - keeps the cookie + CSRF header behavior consistent
// everywhere requests are made.
export const AUTH_FETCH_OPTIONS = {
  credentials: 'include',
  csrfHeader: { 'X-Requested-With': 'dsa-visualizer' },
};

// Exposed so every direct fetch() caller (like LinkedListVisualizer.jsx) resolves
// REST calls the same way this file does - through the same-origin Vercel proxy
// in production - instead of each file guessing its own base URL and risking the
// cookie/CORS mismatch explained above. Socket.io is a separate concern: it can't
// go through that proxy, so it uses its own VITE_SOCKET_URL (see that file).
export { API_BASE };
