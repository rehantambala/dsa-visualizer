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
      });
  }, []);

  const login = useCallback(async (username, password) => {
    setPending(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      setStoredUser(res.user);
      setUser(res.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const register = useCallback(async (username, password) => {
    setPending(true);
    setError(null);
    try {
      const res = await api.register(username, password);
      setStoredUser(res.user);
      setUser(res.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    setPending(true);
    setError(null);
    try {
      const res = await api.googleLogin(idToken);
      setStoredUser(res.user);
      setUser(res.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.logout().catch(() => {
      // Best-effort - clear local state either way so the UI reflects logged-out.
    });
    clearStoredUser();
    setUser(null);
  }, []);

  return { user, login, register, loginWithGoogle, logout, error, pending, isLoggedIn: Boolean(user) };
}
