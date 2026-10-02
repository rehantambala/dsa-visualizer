/**
 * frontend/src/components/auth/AuthModal.jsx
 *
 * The ACCESS TERMINAL panel (AuthPanel.jsx) in an overlay - shown when a
 * logged-out user tries to open a module. Same panel as the intro screen, just
 * without the logo/title/background field.
 */
import { useEffect } from 'react';
import AuthPanel from './AuthPanel.jsx';
import './auth.css';

// Brief beat on "ACCESS GRANTED" before the modal closes.
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function AuthModal({ auth, onClose, onCancel, hint }) {
  // Backing out (backdrop click, CLOSE, or Esc) is different from the modal
  // closing itself after a successful login/register: a caller that's using
  // this modal to gate access to something (see LandingPage.jsx) needs to
  // know "the user gave up" separately from "auth succeeded, hide the modal" -
  // otherwise a plain onClose fired on success would race the caller's own
  // "resume what I was doing" effect and wipe out its state before that
  // effect ever sees it.
  const handleDismiss = () => {
    onCancel?.();
    onClose();
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-overlay" onClick={handleDismiss}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-bar">
          {hint && <p className="auth-modal-hint">{hint}</p>}
          <button type="button" className="auth-close" onClick={handleDismiss} aria-label="Close">CLOSE ×</button>
        </div>
        <AuthPanel auth={auth} onSuccess={async () => { await pause(600); onClose(); }} />
      </div>
    </div>
  );
}

export default AuthModal;
