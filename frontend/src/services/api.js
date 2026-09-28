const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// The login token lives in an HttpOnly cookie now (not in JS-readable storage -
// see utils/auth.js), so there's no token to attach manually. `credentials:
// 'include'` makes the browser send/accept that cookie on cross-port requests
// during local dev (and cross-subdomain in production). The custom header is
// required by the backend's CSRF guard (backend/src/middleware/csrf.js) on
// every mutating request - see that file for why a custom header stops CSRF.
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'dsa-visualizer',
      ...(options.headers || {}),
    },
    ...options,
  });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const message = body?.message || `Request failed: ${path}`;
    throw new Error(message);
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
