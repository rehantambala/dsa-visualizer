/**
 * frontend/src/components/intro/IntroScreen.jsx
 *
 * First screen for logged-out users - design/intro-reference.html in React:
 *   1. PathfindingField behind everything (the dot grid solving for the cursor)
 *   2. explored logo intro: walls → start → explored flood → V path → goal
 *   3. "DSA_VISUALIZER" decodes left to right, then tagline, then hint
 *   4. the ACCESS TERMINAL panel (AuthPanel) rises in
 * On success: full-screen flood + pink flash, then onDone().
 *
 * The full intro plays once per browser session (sessionStorage); after that,
 * or under prefers-reduced-motion, it opens straight on the end state. Any
 * click or key outside the panel skips to the end state.
 */
import { useEffect, useRef, useState } from 'react';
import Logo from '../Logo.jsx';
import { EXPLORED, INTRO } from '../logoData.js';
import AuthPanel from '../auth/AuthPanel.jsx';
import PathfindingField from './PathfindingField.jsx';
import './intro.css';

const PLAYED_KEY = 'dsa-intro-played';
const TXT = 'DSA_VISUALIZER';
const GLYPHS = '01#%&$@<>/\\*+=';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion() ? 0 : ms));

function alreadyPlayed() {
  try { return sessionStorage.getItem(PLAYED_KEY) === '1'; } catch { return false; }
}
function markPlayed() {
  try { sessionStorage.setItem(PLAYED_KEY, '1'); } catch { /* private mode - intro just replays */ }
}

// title: null = not started; otherwise `done` chars settled, chars up to `scr` scrambling
function Title({ state }) {
  return (
    <h1 className="ix-title" aria-label={TXT}>
      {state && (
        <>
          {[...TXT].map((ch, i) => {
            if (i < state.done) return ch === '_' ? <i key={i}>_</i> : ch;
            if (i < state.scr) return <span key={i} className="s">{GLYPHS[(Math.random() * GLYPHS.length) | 0]}</span>;
            return null;
          })}
          <span className="ix-cur" />
        </>
      )}
    </h1>
  );
}

export default function IntroScreen({ auth, onBusyChange, onDone }) {
  const [skipAtStart] = useState(() => reduceMotion() || alreadyPlayed());
  const [logoMode, setLogoMode] = useState(skipAtStart ? 'static' : 'intro');
  const [title, setTitle] = useState(skipAtStart ? { done: TXT.length, scr: 0 } : null);
  const [showTag, setShowTag] = useState(skipAtStart);
  const [showPanel, setShowPanel] = useState(skipAtStart);
  const [flash, setFlash] = useState(0);
  const [coarse] = useState(() => matchMedia('(pointer: coarse)').matches);
  const markRef = useRef(null);
  const panelRef = useRef(null);
  const fieldRef = useRef(null);

  // ---- intro timeline (reference section 3) ----
  useEffect(() => {
    if (skipAtStart) { markPlayed(); return undefined; }
    const timers = [];
    let raf = 0;
    let done = false;
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    const finish = () => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      setLogoMode('static');
      setTitle({ done: TXT.length, scr: 0 });
      setShowTag(true);
      setShowPanel(true);
      markPlayed();
    };

    const decode = () => {
      const t0 = performance.now();
      const step = (now) => {
        const e = now - t0;
        const scr = Math.min(TXT.length, Math.floor(e / 45) + 3);
        const settled = Math.min(TXT.length, Math.floor(Math.max(0, e - 160) / 45));
        setTitle({ done: settled, scr });
        if (settled < TXT.length) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const tEnd = INTRO.end(EXPLORED);
    at(tEnd, () => fieldRef.current?.pulse());
    at(tEnd + 150, decode);
    const tT = tEnd + 150 + TXT.length * 45 + 200;
    at(tT + 150, () => setShowTag(true));
    at(tT + 450, () => { setShowPanel(true); done = true; markPlayed(); });

    const skip = (e) => { if (!done && !panelRef.current?.contains(e.target)) finish(); };
    addEventListener('pointerdown', skip);
    addEventListener('keydown', skip);
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      removeEventListener('pointerdown', skip);
      removeEventListener('keydown', skip);
    };
  }, [skipAtStart]);

  // ---- success sequence (reference section 5) ----
  const handleGranted = async () => {
    fieldRef.current?.flood();
    await wait(1100);
    setFlash(0.9);
    await wait(450);
  };
  const handleEntered = async () => {
    setFlash(0);
    await wait(500);
    onDone?.();
  };

  return (
    <div className="ix">
      <PathfindingField ref={fieldRef} sourceRef={markRef} />
      <div className="ix-flash" style={{ opacity: flash }} aria-hidden="true" />
      <div className="ix-wrap">
        <main className="ix-stage">
          <div className="ix-mark" ref={markRef}>
            <Logo variant="explored" mode={logoMode} size={168} />
          </div>
          <Title state={title} />
          <p className={`ix-tag ${showTag ? 'is-shown' : ''}`}>Nine modules. Real algorithms, step by step.</p>
          <p className={`ix-hint ${showPanel ? 'is-shown' : ''}`}>
            {coarse
              ? <><b>the grid is solving</b> · watch the background</>
              : <>move your cursor · <b>the grid is solving for it</b></>}
          </p>
          <AuthPanel
            ref={panelRef}
            auth={auth}
            revealed={showPanel}
            onBusyChange={onBusyChange}
            onGranted={handleGranted}
            onEntered={handleEntered}
          />
        </main>
      </div>
    </div>
  );
}
