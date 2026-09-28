/**
 * frontend/src/components/auth/GoogleSignInButton.jsx
 *
 * Renders Google's own "Continue with Google" button (via Google Identity
 * Services, loaded in index.html): filled_black / rectangular / large, sized
 * to the full width of its container (Google caps it at 200-400px) so it sits
 * flush with the ACCESS TERMINAL inputs. Re-rendered when the container
 * width changes.
 *
 * Requires VITE_GOOGLE_CLIENT_ID to be set (see frontend/.env.example). If
 * it's missing, this renders a disabled look-alike with a hint instead of a
 * broken button - the rest of the app works fine either way.
 */
import { useEffect, useRef, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleSignInButton({ onCredential, disabled }) {
  const buttonRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [width, setWidth] = useState(0);
  // GIS keeps whatever callback it was initialized with, so route it through
  // a ref - the parent's latest onCredential is always the one that runs.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID) return undefined;

    let cancelled = false;
    const trySetup = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id) {
        setScriptReady(true);
        return;
      }
      window.setTimeout(trySetup, 150);
    };
    trySetup();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(Math.min(400, Math.max(200, entry.contentRect.width))));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!scriptReady || !CLIENT_ID || !buttonRef.current || !width) return;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => onCredentialRef.current(response.credential),
    });

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "filled_black",
      shape: "rectangular",
      size: "large",
      text: "continue_with",
      logo_alignment: "left",
      width,
    });
  }, [scriptReady, width]);

  if (!CLIENT_ID) {
    return (
      <div className="google-btn-wrap">
        <button type="button" className="google-btn-fallback" disabled title="Google sign-in is not configured yet">
          <GoogleGlyph />
          <span>Continue with Google</span>
        </button>
        <p className="google-btn-hint">
          Set VITE_GOOGLE_CLIENT_ID (and backend GOOGLE_CLIENT_ID) to enable this.
        </p>
      </div>
    );
  }

  return (
    <div className={`google-btn-wrap ${disabled ? "is-disabled" : ""}`}>
      <div ref={buttonRef} className="google-btn-mount" />
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export default GoogleSignInButton;
