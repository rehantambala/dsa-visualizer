/**
 * frontend/src/components/intro/IntroScreen.jsx
 *
 * First screen for logged-out users - design/intro-reference.html (v3) in React:
 *   1. PathfindingField behind everything (the dot grid solving for the cursor)
 *   2. explored logo intro: walls → start → explored flood → V path → goal
 *   3. "DSA_VISUALIZER" decodes left to right, then tagline, then hint
 *   4. the ACCESS TERMINAL panel (AuthPanel) rises in
 *   6. on success, the ENTRY TRANSITION "COLLAPSE → TRAVERSE" (reference section 6):
 *      a. the UI powers off like a CRT
 *      b. reverse BFS: a pink ring contracts from the screen edges into the logo
 *      c. the logo compresses into one glowing pixel (#sing)
 *      d. the real landing page is traversed into existence by a BFS flood from
 *         that pixel (#portal), while the pixel flies into the landing's
 *         top-left brand and becomes the live navbar logo
 *
 * Host callbacks (App.jsx): onReveal() mount the landing underneath (step d),
 * onBrandOn() show the landing brand (the pixel has landed), onDone() drop
 * this screen. Reduced motion: a plain crossfade.
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
// Where the flying pixel lands - the landing page's top-left brand mark.
const BRAND_TARGET = '.landing-brand .logo';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion() ? 0 : ms));
const frame = () => new Promise((r) => requestAnimationFrame(r));

function alreadyPlayed() {
  try { return sessionStorage.getItem(PLAYED_KEY) === '1'; } catch { return false; }
}
function markPlayed() {
  try { sessionStorage.setItem(PLAYED_KEY, '1'); } catch { /* private mode - intro just replays */ }
}

// Reference section 6d, verbatim: a BFS flood from (cx, cy) over 28px cells
// (10% seeded walls) clears a black cover cell by cell with a pink frontier,
// then the leftover wall cells dissolve.
function traverseReveal(cv, cx, cy, dur) {
  return new Promise((res) => {
    const ctx = cv.getContext('2d'), G = 28;
    const dpr = Math.min(devicePixelRatio || 1, 2); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); cv.style.display = 'block';
    const cols = Math.ceil(innerWidth / G), rows = Math.ceil(innerHeight / G), n = cols * rows;
    let seed = 11; const rnd = () => ((seed = Math.imul(seed ^ seed >>> 15, seed | 1) + 0x6D2B79F5 | 0) >>> 0) / 4294967296;
    const walls = new Uint8Array(n); for (let i = 0; i < n; i++) walls[i] = rnd() < 0.1 ? 1 : 0;
    const s0 = Math.min(rows - 1, Math.max(0, Math.floor(cy / G))) * cols + Math.min(cols - 1, Math.max(0, Math.floor(cx / G))); walls[s0] = 0;
    const dist = new Int16Array(n).fill(-1), q = new Int32Array(n); let h = 0, t = 0; dist[s0] = 0; q[t++] = s0; const order = [];
    while (h < t) {
      const c = q[h++]; order.push(c); const x = c % cols, y = c / cols | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue; const k = ny * cols + nx;
        if (dist[k] < 0 && !walls[k]) { dist[k] = dist[c] + 1; q[t++] = k; }
      }
    }
    const maxD = dist[order[order.length - 1]] + 3, t0 = performance.now();
    const draw = (now) => {
      const p = Math.min(1, (now - t0) / dur), r = maxD * (1 - Math.pow(1 - p, 2.2));
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, innerWidth, innerHeight);
      for (const c of order) {
        const d = dist[c]; if (d > r) break; const x = (c % cols) * G, y = (c / cols | 0) * G; ctx.clearRect(x, y, G, G);
        const b = r - d; if (b < 3) { ctx.fillStyle = `rgba(255,44,143,${0.55 * (1 - b / 3)})`; ctx.fillRect(x + 2, y + 2, G - 4, G - 4); }
      }
      if (p >= 1) { // leftover wall cells dissolve
        cv.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished.then(() => { cv.style.display = 'none'; cv.getAnimations().forEach((a) => a.cancel()); res(); }); return;
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });
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

export default function IntroScreen({ auth, onBusyChange, onReveal, onBrandOn, onDone }) {
  const [skipAtStart] = useState(() => reduceMotion() || alreadyPlayed());
  const [logoMode, setLogoMode] = useState(skipAtStart ? 'static' : 'intro');
  const [title, setTitle] = useState(skipAtStart ? { done: TXT.length, scr: 0 } : null);
  const [showTag, setShowTag] = useState(skipAtStart);
  const [showPanel, setShowPanel] = useState(skipAtStart);
  const [coarse] = useState(() => matchMedia('(pointer: coarse)').matches);
  // entry transition phases
  const [uiOff, setUiOff] = useState(false);
  const [collapse, setCollapse] = useState(false);
  const [gone, setGone] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const rootRef = useRef(null);
  const markRef = useRef(null);
  const panelRef = useRef(null);
  const fieldRef = useRef(null);
  const portalRef = useRef(null);
  const singRef = useRef(null);

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

  // ---- entry transition (reference section 6, enterLab) ----
  const enterLab = async () => {
    if (reduceMotion()) {
      // reduced motion: plain crossfade, intro out → landing in
      await rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished;
      onReveal?.(); onBrandOn?.(); onDone?.();
      await frame();
      document.querySelector('.landing-layer')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      return;
    }
    const sing = singRef.current;
    // a. terminal powers off
    setUiOff(true);
    // b. reverse BFS: ring contracts into the logo
    fieldRef.current?.implode(900);
    await wait(420);
    // c. logo compresses into a single pixel
    setCollapse(true);
    await wait(470);
    const b = markRef.current.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    Object.assign(sing.style, { display: 'block', left: cx - 4 + 'px', top: cy - 4 + 'px', width: '8px', height: '8px', opacity: 1 });
    setGone(true);
    sing.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.8)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
    await wait(380);
    fieldRef.current?.clear();
    // d. traverse the landing into existence while the pixel becomes the navbar logo
    setRevealed(true);
    onReveal?.();
    const reveal = traverseReveal(portalRef.current, cx, cy, 1050);
    await frame();
    const t = document.querySelector(BRAND_TARGET)?.getBoundingClientRect();
    if (t) Object.assign(sing.style, { left: t.left + 'px', top: t.top + 'px', width: t.width + 'px', height: t.height + 'px' });
    await wait(760);
    onBrandOn?.(); sing.style.opacity = 0;
    await reveal;
    sing.style.display = 'none';
    onDone?.();
  };

  const handleSuccess = async () => {
    await wait(650);
    await enterLab();
  };

  return (
    <>
      <div className={`ix${revealed ? ' is-revealed' : ''}`} ref={rootRef}>
        <PathfindingField ref={fieldRef} sourceRef={markRef} />
        <div className={`ix-wrap${gone ? ' gone' : ''}`}>
          <main className="ix-stage">
            <div className={`ix-mark${collapse ? ' collapse' : ''}`} ref={markRef}>
              <Logo variant="explored" mode={logoMode} size={168} />
            </div>
            <div className={`ix-ui${uiOff ? ' crt-off' : ''}`}>
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
                onSuccess={handleSuccess}
              />
            </div>
          </main>
        </div>
      </div>
      <canvas id="portal" ref={portalRef} aria-hidden="true" />
      <div id="sing" ref={singRef} aria-hidden="true" />
    </>
  );
}
