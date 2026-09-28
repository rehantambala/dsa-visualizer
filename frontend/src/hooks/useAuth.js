/**
 * frontend/src/hooks/useAuth.js
 *
 * Small auth hook (no context provider needed - App.jsx owns the single instance
 * and passes what's needed down). Backs the login/register modal and the
 * topbar's login state. The actual login token lives in an HttpOnly cookie the
 * browser manages automatically (see utils/auth.js and services/api.js) - this
 * hook only caches the non-sensitive user object for a fast first paint, and
 * always confirms it against api.me() since there's no token here to inspect.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { getStoredUser, setStoredUser, clearStoredUser } from '../utils/auth.js';

export function useAuth() {
  const [user, setUser] = useState(() => getStoredUser());
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  // true until the first api.me() settles - App.jsx holds a blank screen
  // (briefly) while this is unresolved so nobody sees the wrong first screen.
  const [checking, setChecking] = useState(true);

  // Always confirm against the server on mount - the HttpOnly cookie can't be
  // inspected from JS, so a cached user object alone can't tell us whether the
  // session is still valid (expired token, logged out elsewhere, etc.).
  useEffect(() => {
    api
      .me()
      .then((res) => {
        setUser(res.user);
        setStoredUser(res.user);
      })
      .catch(() => {
        clearStoredUser();
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  // login / register / loginWithGoogle resolve to { ok: true } or
  // { ok: false, error } where error is an ApiError (see services/api.js) -
  // callers read error.kind ('unauthorized' | 'server' | 'network') straight
  // off the result instead of waiting for the `error` state to re-render.
  const run = useCallback(async (call) => {
    setPending(true);
    setError(null);
    try {
      const res = await call();
      setStoredUser(res.user);
      setUser(res.user);
      return { ok: true };
    } catch (err) {
      setError(err.message);
      return { ok: false, error: err };
    } finally {
      setPending(false);
    }
  }, []);

  const login = useCallback((username, password) => run(() => api.login(username, password)), [run]);
  const register = useCallback((username, password) => run(() => api.register(username, password)), [run]);
  const loginWithGoogle = useCallback((idToken) => run(() => api.googleLogin(idToken)), [run]);

  const logout = useCallback(() => {
    api.logout().catch(() => {
      // Best-effort - clear local state either way so the UI reflects logged-out.
    });
    clearStoredUser();
    setUser(null);
  }, []);

  return { user, login, register, loginWithGoogle, logout, error, pending, checking, isLoggedIn: Boolean(user) };
}
