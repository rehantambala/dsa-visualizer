/**
 * frontend/src/utils/auth.js
 *
 * The login token itself now lives in an HttpOnly cookie set by the backend
 * (see backend/src/controllers/authController.js) - it is never readable by
 * JavaScript, so there is nothing here to fetch or attach to requests
 * anymore. This module only caches the (non-sensitive) logged-in user object
 * in localStorage purely so the UI can show "logged in as X" immediately on
 * page load, before the api.me() round-trip confirms the cookie is still
 * valid. useAuth.js is the source of truth; this is just a fast first paint.
 */

const USER_KEY = "dsa-visualizer-user";

export function getStoredUser() {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage unavailable - the session cookie still works, the UI just
    // won't have an optimistic username to show before api.me() resolves.
  }
}

export function clearStoredUser() {
  try {
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // no-op
  }
}
