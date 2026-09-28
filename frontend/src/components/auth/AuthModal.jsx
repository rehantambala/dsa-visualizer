/**
 * frontend/src/components/auth/AuthModal.jsx
 *
 * Login/register modal. Logging in makes LinkedList saves private to your
 * account (backend/src/controllers/simulationController.js resolves the save
 * key to `user:<id>` when authenticated) instead of a shared/guessable string.
 */
import { useState } from 'react';
import GoogleSignInButton from './GoogleSignInButton.jsx';
import { sounds } from '../utils/audioEngine.js';
import './auth.css';

function AuthModal({ auth, onClose, onCancel, hint }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const fn = mode === 'login' ? auth.login : auth.register;
    const ok = await fn(username, password);
    if (ok) {
      sounds.success();
      onClose();
    } else {
      sounds.error();
    }
  };

  const handleGoogleCredential = async (idToken) => {
    const ok = await auth.loginWithGoogle(idToken);
    if (ok) {
      sounds.success();
      onClose();
    } else {
      sounds.error();
    }
  };

  // Backing out (backdrop click or the × button) is different from the modal
  // closing itself after a successful login/register: a caller that's using
  // this modal to gate access to something (see LandingPage.jsx) needs to
  // know "the user gave up" separately from "auth succeeded, hide the modal" -
  // otherwise a plain onClose fired from handleSubmit/handleGoogleCredential
  // below would race the caller's own "resume what I was doing" effect and
  // wipe out its state before that effect ever sees it.
  const handleDismiss = () => {
    onCancel?.();
    onClose();
  };

  return (
    <div className="auth-overlay" onClick={handleDismiss}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div className="panel-title">{mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}</div>
          <button type="button" className="auth-close" onClick={handleDismiss} aria-label="Close">×</button>
        </div>

        <p className="auth-modal-hint">
          {mode === 'login'
            ? hint || 'Log in to keep your Linked List saves private to your account.'
            : 'Pick a username and password - takes ten seconds, no email needed.'}
        </p>

        <GoogleSignInButton onCredential={handleGoogleCredential} disabled={auth.pending} />

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>USERNAME</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={24}
              required
            />
          </label>
          <label className="field">
            <span>PASSWORD</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </label>

          {auth.error && <div className="auth-error">{auth.error}</div>}

          <button className="pixel-btn" type="submit" disabled={auth.pending}>
            {auth.pending ? 'WORKING...' : mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}
        >
          {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}

export default AuthModal;
