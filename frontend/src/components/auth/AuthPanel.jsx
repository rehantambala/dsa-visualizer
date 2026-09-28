/**
 * frontend/src/components/auth/AuthPanel.jsx
 *
 * The "> ACCESS TERMINAL" login/sign-up panel from design/intro-reference.html
 * (sections 4-5). Used inline on the intro screen and inside AuthModal, so both
 * look identical.
 *
 * - typing pushes cells onto the STACK strip (password = pink masked cells)
 * - submit: cells scramble into hex → "» encoded · <hex>… · sending" → real
 *   API call (useAuth login/register) → success or a pink ✖ error line
 * - Google sign-in goes through the same success/failure handling
 *
 * Success hooks let the host add its own moment before moving on:
 *   onGranted() - after "✔ PATH FOUND · ACCESS GRANTED" (intro: flood + flash)
 *   onEntered() - after "› entering the lab…" (intro: hand off to the app)
 * onBusyChange(bool) tells the host a submit is in flight, so it can keep this
 * panel on screen while the success sequence plays even though useAuth has
 * already flipped isLoggedIn.
 */
import { forwardRef, useEffect, useRef, useState } from 'react';
import GoogleSignInButton from './GoogleSignInButton.jsx';
import { sounds } from '../utils/audioEngine.js';
import './auth.css';

const MAXC = 14;
const HEX = '0123456789abcdef';
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion() ? 0 : ms));

// Visual only - a short FNV-1a digest so the "encoded" line looks like a real
// hash of what was typed. Nothing is sent in this form.
function digest(str) {
  let h = 0x811c9dc5;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function stackItems(username, password) {
  const items = [...username].map((c) => ({ c }));
  if (password.length) {
    items.push({ c: '·', sep: true });
    for (let i = 0; i < password.length; i++) items.push({ c: '', m: true });
  }
  return items;
}

// Index of the cell a keystroke just pushed (the first position that differs),
// so only that cell plays the push animation - not the whole strip.
function pushedIndex(prev, next) {
  let idx = next.findIndex((it, i) => !prev[i] || it.c !== prev[i].c || !it.m !== !prev[i].m || !it.sep !== !prev[i].sep);
  // the first password character also adds the separator; the new cell is the masked one
  if (idx < 0 || next[idx].sep) idx = next.length - 1;
  return idx;
}

function errorLine(err, method) {
  if (!err || err.kind === 'network') return '✖ NO ROUTE TO SERVER · is the backend running?';
  if (err.kind === 'unauthorized' && method === 'login') return '✖ 401 · NO PATH FOUND · wrong username or password';
  if (method === 'register' && err.status === 409) return '✖ 409 · USERNAME TAKEN · pick another';
  return `✖ ${err.status} · ${err.message}`;
}

const AuthPanel = forwardRef(function AuthPanel(
  { auth, revealed = true, onBusyChange, onGranted, onEntered, className = '' },
  ref
) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [log, setLog] = useState({ kind: '', text: '' });
  const [push, setPush] = useState({ index: -1, gen: 0 });
  const [scrambling, setScrambling] = useState(false);
  const [, setTick] = useState(0);
  const formRef = useRef(null);
  const mounted = useRef(true);

  // Set on (re)mount too - StrictMode runs this cleanup once in development.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const setRef = (node) => {
    formRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const items = stackItems(username, password);
  const visible = items.slice(-MAXC);
  const hidden = items.length - visible.length;

  const updateFields = (nextUser, nextPw) => {
    const next = stackItems(nextUser, nextPw);
    setPush((p) => (next.length > items.length && !reduceMotion()
      ? { index: pushedIndex(items, next), gen: p.gen + 1 }
      : { ...p, index: -1 }));
    setUsername(nextUser);
    setPassword(nextPw);
  };

  const setBusyBoth = (value) => { setBusy(value); onBusyChange?.(value); };

  const scramble = (ms) => new Promise((resolve) => {
    if (reduceMotion() || !items.some((it) => !it.sep)) return resolve();
    setScrambling(true);
    const t0 = performance.now();
    const f = (n) => {
      if (!mounted.current) return resolve();
      setTick((t) => t + 1);
      if (n - t0 < ms) requestAnimationFrame(f); else resolve();
    };
    requestAnimationFrame(f);
  });

  const succeed = async () => {
    sounds.success();
    setLog({ kind: 'good', text: 'granted' });
    setOk(true);
    await onGranted?.();
    if (!mounted.current) return;
    setLog({ kind: 'good', text: 'entering' });
    await onEntered?.();
  };

  const fail = (err, method) => {
    sounds.error();
    setScrambling(false);
    setLog({ kind: 'err', text: errorLine(err, method) });
    formRef.current?.animate?.(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
      { duration: 260 }
    );
    setBusyBoth(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusyBoth(true);
    setOk(false);
    setLog({ kind: '', text: `» pushing ${username.length + password.length} cells…` });
    await scramble(650);
    if (!mounted.current) return;
    setLog({ kind: '', text: `» encoded · ${digest(`${username}:${password}`)}… · sending` });
    const method = mode === 'login' ? 'login' : 'register';
    const [result] = await Promise.all([auth[method](username, password), wait(700)]);
    if (!mounted.current) return;
    if (result.ok) await succeed();
    else fail(result.error, method);
  };

  const handleGoogle = async (idToken) => {
    if (busy) return;
    setBusyBoth(true);
    setOk(false);
    setLog({ kind: '', text: '» google credential · sending' });
    const result = await auth.loginWithGoogle(idToken);
    if (!mounted.current) return;
    if (result.ok) await succeed();
    else fail(result.error, 'google');
  };

  const cellText = (it) => (scrambling && !it.sep ? HEX[(Math.random() * 16) | 0] : it.c);

  return (
    <form
      ref={setRef}
      className={`term ${revealed ? 'is-shown' : ''} ${ok ? 'is-ok' : ''} ${className}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="term-head">
        <span className="term-title">&gt; ACCESS TERMINAL</span>
        <span className="term-toggle">
          <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>LOG IN</button>
          {' / '}
          <button type="button" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>SIGN UP</button>
        </span>
      </div>

      <div className="term-mem" aria-hidden="true">
        <span className="term-mem-lbl">STACK</span>
        <div className="term-cells">
          {!items.length && <span className="term-empty">empty · start typing</span>}
          {hidden > 0 && <span className="term-more">+{hidden}</span>}
          {visible.map((it, i) => {
            const at = hidden + i;
            const pushed = at === push.index;
            return (
              <span
                key={pushed ? `push-${push.gen}` : at}
                className={`term-cell${it.m ? ' m' : ''}${it.sep ? ' sep' : ''}${scrambling && !it.sep ? ' h' : ''}${pushed ? ' push' : ''}`}
              >
                {cellText(it)}
              </span>
            );
          })}
        </div>
      </div>

      <label className="term-field">
        <i>›</i>
        <input
          name="username"
          placeholder="username"
          autoComplete="username"
          aria-label="Username"
          spellCheck="false"
          value={username}
          onChange={(e) => updateFields(e.target.value, password)}
        />
      </label>
      <label className="term-field">
        <i>›</i>
        <input
          name="password"
          type={showPw ? 'text' : 'password'}
          placeholder="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          aria-label="Password"
          value={password}
          onChange={(e) => updateFields(username, e.target.value)}
        />
        <button
          type="button"
          className="term-eye"
          aria-label={showPw ? 'Hide password' : 'Show password'}
          onClick={() => setShowPw((s) => !s)}
        >
          {showPw ? 'HIDE' : 'SHOW'}
        </button>
      </label>

      <p className={`term-log ${log.kind}`} role="status">
        {log.text === 'granted' ? <><b>✔</b> PATH FOUND · ACCESS GRANTED</>
          : log.text === 'entering' ? <><b>›</b> entering the lab…</>
          : log.text}
      </p>
      <button className="term-submit" type="submit" disabled={busy}>
        {busy ? 'AUTHENTICATING…' : mode === 'login' ? 'RUN · LOG IN' : 'RUN · CREATE ACCOUNT'}
      </button>
      <div className="term-or">OR</div>
      <div className="term-google">
        <GoogleSignInButton onCredential={handleGoogle} disabled={busy} />
      </div>
    </form>
  );
});

export default AuthPanel;
