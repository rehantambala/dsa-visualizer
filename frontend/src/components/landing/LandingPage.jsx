/**
 * frontend/src/components/landing/LandingPage.jsx
 *
 * REDESIGNED (round 2): v2 fixed the module cards/stats to reuse real pixel-block
 * components, but the title was still plain fade-up text and the page used its own
 * invented background instead of the app's real signature moment - the sci-fi
 * "energy burst" page transition (.page-energy-layer in index.css: pulsing core,
 * expanding ring, scanline sweep, flying fragments - the same effect App.jsx fires
 * every time you switch visualizer pages). This version:
 *   - uses the real .pixel-noise / .pink-glow background layers, not custom ones
 *   - fires the actual energy-burst effect on mount (from screen center) and again
 *     from the click point when entering a module, so landing feels like the same
 *     machine as the rest of the app, not a separate page bolted onto it
 *   - the title decodes in character-by-character from scrambled glyphs (terminal
 *     decrypt effect) instead of a plain fade, then settles into a periodic glitch
 *     flicker - matches the "SYSTEM BOOT" / "core memory" terminal voice already
 *     used in LinkedListVisualizer's save/load messages
 */
import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import AuthModal from '../auth/AuthModal.jsx';
import PixelNumber from '../shared/PixelNumber.jsx';
import { useSound } from '../../hooks/useSound.js';
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll.js';
import Reveal from '../shared/Reveal.jsx';
import './landing.css';

const MODULES = [
  { key: 'array', title: 'ARRAY', tag: 'CORE', desc: 'Insert, delete, update, index. Full history restore.' },
  { key: 'stack', title: 'STACK', tag: 'CORE', desc: 'LIFO push/pop with a real call-stack feel.' },
  { key: 'queue', title: 'QUEUE', tag: 'CORE', desc: 'FIFO enqueue/dequeue as a flowing pixel channel.' },
  { key: 'linked-list', title: 'LINKED LIST', tag: 'CORE + LIVE', desc: 'Real pointer chains. DB-backed save/restore, live multi-tab sync.' },
  { key: 'sorting', title: 'SORTING', tag: 'ALGORITHMS', desc: 'Bubble, Selection, Insertion, Merge, Quick - every real compare/swap.' },
  { key: 'graph', title: 'GRAPH', tag: 'ALGORITHMS', desc: 'Build your own graph. Real BFS/DFS on the actual adjacency list.' },
  { key: 'tree', title: 'BINARY TREE', tag: 'ALGORITHMS', desc: 'A real BST - insert/delete/search walk actual left/right children.' },
  { key: 'pathfinding', title: 'PATHFINDING', tag: 'ALGORITHMS', desc: 'Dijkstra, A*, Greedy, BFS on an editable walled grid.' },
  { key: 'analytics', title: 'ANALYTICS', tag: 'LIVE DATA', desc: 'Every run above logs to Mongo in real time. This is that data.' },
];

const BOOT_LINES = [
  '> DSA_VISUALIZER — SYSTEM BOOT',
  '> LOADING 9 MODULES ... OK',
  '> CORE MEMORY LINK (MONGODB) ... OK',
  '> READY.',
];

const GLYPHS = '!<>-_\\/[]{}—=+*^?#01';
const TITLE = 'DSA VISUALIZER';

function BootSequence() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const { sounds } = useSound();

  useEffect(() => {
    if (lineIndex >= BOOT_LINES.length) return undefined;
    const currentLine = BOOT_LINES[lineIndex];
    if (charIndex < currentLine.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 14);
      return () => clearTimeout(t);
    }
    sounds.bootTick();
    const t = setTimeout(() => {
      setLineIndex((l) => l + 1);
      setCharIndex(0);
    }, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIndex, charIndex]);

  return (
    <div className="landing-boot">
      {BOOT_LINES.slice(0, lineIndex).map((line, i) => (
        <div key={i} className="landing-boot-line">{line}</div>
      ))}
      {lineIndex < BOOT_LINES.length && (
        <div className="landing-boot-line">
          {BOOT_LINES[lineIndex].slice(0, charIndex)}
          <span className="landing-cursor">▌</span>
        </div>
      )}
    </div>
  );
}

// Terminal-decrypt title: every character starts as random glyph noise and
// resolves left-to-right into the real word, like a HUD decoding a signal. Once
// fully decoded it settles into a periodic RGB-split glitch flicker (CSS-driven,
// see .landing-title.is-decoded in landing.css) instead of sitting static.
function DecodeTitle() {
  const [display, setDisplay] = useState(() => TITLE.split('').map((c) => (c === ' ' ? ' ' : '#')));
  const [decoded, setDecoded] = useState(false);
  const frameRef = useRef(0);
  const { sounds } = useSound();

  useEffect(() => {
    let raf;
    const resolvedUpTo = { current: 0 };
    const tick = () => {
      frameRef.current += 1;
      if (frameRef.current % 2 === 0 && resolvedUpTo.current < TITLE.length) {
        resolvedUpTo.current += 1;
      }
      setDisplay(
        TITLE.split('').map((c, i) => {
          if (c === ' ') return ' ';
          if (i < resolvedUpTo.current) return c;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
      );
      if (resolvedUpTo.current < TITLE.length) {
        raf = requestAnimationFrame(tick);
      } else {
        sounds.decodeComplete();
        setDecoded(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <h1 className={`landing-title ${decoded ? 'is-decoded' : ''}`} data-text={TITLE}>
      {display.map((ch, i) => (
        <span key={i} className="landing-title-char">
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </h1>
  );
}

// Ambient particle field: a handful of drifting glow-dots behind the hero,
// giving the background actual depth instead of two static glow blobs. Count
// stays low (22) and everything animates via transform/opacity only, so this
// stays cheap even on modest hardware. Positions/delays are randomized once
// per mount, not every render.
const PARTICLE_COUNT = 22;

function useParticleField() {
  // useState's lazy initializer (not useMemo) - useMemo is documented as a
  // performance hint React is allowed to discard and recompute, which would
  // silently reshuffle every particle's position. useState's initializer has
  // a real "exactly once per mount" guarantee, which is what a stable
  // one-time random layout actually needs.
  const [particles] = useState(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      depth: 0.3 + Math.random() * 0.9, // parallax weight - farther particles drift less
      duration: 9 + Math.random() * 10,
      delay: Math.random() * -12,
    }))
  );
  return particles;
}

function ParticleField({ particles }) {
  return (
    <div className="landing-particles" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="landing-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            '--particle-depth': p.depth,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function StatCard({ digits, label, status }) {
  return (
    <div className="pixel-block landing-stat-block">
      <div className="pixel-block-aura" />
      <div className="pixel-block-corners"><span /><span /><span /><span /></div>
      <div className="pixel-block-topline">
        <div className="pixel-block-status">{status}</div>
        <div className="pixel-block-energy" />
      </div>
      <div className="pixel-grid">
        {Array.from({ length: 64 }, (_, i) => <span key={i} className="pixel-cell" />)}
      </div>
      <div className="pixel-value pixel-value-matrix landing-stat-value">
        <PixelNumber value={digits} active />
      </div>
      <div className="pixel-block-bottomline">
        <span className="pixel-block-readout">{label}</span>
      </div>
    </div>
  );
}

function ModuleCard({ module, index, onEnter }) {
  const { sounds } = useSound();
  const [revealRef, isVisible] = useRevealOnScroll({ threshold: 0.25 });
  const buttonRef = useRef(null);

  // Magnetic hover: the card tilts toward the cursor and lifts, instead of
  // just translating straight up. Small angles only - this should feel like
  // the card has weight, not like a gimmick.
  const handlePointerMove = (e) => {
    const node = buttonRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty('--tilt-x', `${(-py * 6).toFixed(2)}deg`);
    node.style.setProperty('--tilt-y', `${(px * 8).toFixed(2)}deg`);
    node.style.setProperty('--glow-x', `${(px * 0.5 + 0.5) * 100}%`);
    node.style.setProperty('--glow-y', `${(py * 0.5 + 0.5) * 100}%`);
  };

  const handlePointerLeave = () => {
    const node = buttonRef.current;
    if (!node) return;
    node.style.setProperty('--tilt-x', '0deg');
    node.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <button
      ref={(node) => {
        buttonRef.current = node;
        revealRef.current = node;
      }}
      type="button"
      className={`pixel-block landing-module-block reveal-tilt ${isVisible ? 'is-visible' : ''}`}
      style={{ '--reveal-index': index }}
      onClick={(e) => onEnter(module.key, e)}
      onMouseEnter={() => sounds.hoverBlip()}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="pixel-block-aura" />
      <div className="pixel-block-corners"><span /><span /><span /><span /></div>
      <div className="pixel-block-topline">
        <div className="pixel-block-status">{module.tag}</div>
        <div className="pixel-block-energy" />
      </div>
      <div className="pixel-grid">
        {Array.from({ length: 64 }, (_, i) => <span key={i} className="pixel-cell" />)}
      </div>
      <div className="landing-module-body">
        <div className="landing-module-title">{module.title}</div>
        <p className="landing-module-desc">{module.desc}</p>
      </div>
      <div className="pixel-block-bottomline">
        <span className="pixel-block-readout">ENTER →</span>
      </div>
    </button>
  );
}

function LandingPage({ onEnter, auth }) {
  const [runsLogged, setRunsLogged] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { sounds } = useSound();
  const pageRef = useRef(null);
  const ctaRef = useRef(null);
  const particles = useParticleField();
  // burst: null | { x, y, key }. `key` forces the energy-layer div to remount on
  // every trigger, which is what actually restarts the CSS keyframe animations -
  // just toggling the "is-active" class again while it's already present does NOT
  // replay a completed animation.
  const [burst, setBurst] = useState(null);
  const scanFragments = [0, 1, 2, 3, 4, 5];
  // Auth gate: entering any module requires a signed-in session. When a guest
  // clicks a card, we remember which one they wanted instead of navigating,
  // and open the auth modal on top of the landing page. Once auth.isLoggedIn
  // flips true (login, register, or Google - all go through the same
  // useAuth state) the effect below finishes the interrupted navigation
  // automatically, so the user doesn't have to click the card a second time.
  const [pendingDestination, setPendingDestination] = useState(null);

  // Cursor-driven parallax on the background glow/noise/grid/particle layers
  // only (never on content) - gives the hero actual depth instead of a flat
  // backdrop. Scoped to this page via .landing-page ... in landing.css, so it
  // never touches the same-named layers on other pages.
  const handlePageMouseMove = (e) => {
    const node = pageRef.current;
    if (!node) return;
    const px = e.clientX / window.innerWidth - 0.5;
    const py = e.clientY / window.innerHeight - 0.5;
    node.style.setProperty('--parallax-x', `${px * 22}px`);
    node.style.setProperty('--parallax-y', `${py * 22}px`);
  };

  // Scroll-linked depth: the grid floor and particle field drift upward
  // slower than the actual page scroll, so as you scroll past the hero the
  // background visibly lags behind the foreground - real parallax depth,
  // not just a cursor trick. rAF-throttled so it never fires more than once
  // per frame.
  useEffect(() => {
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const node = pageRef.current;
        if (node) node.style.setProperty('--scroll-y', `${window.scrollY}px`);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Magnetic pull on the primary CTA - same idea as the module cards, but
  // stronger, since this is the one button on the page we actually want
  // people's eyes and cursor drawn toward.
  const handleCtaMove = (e) => {
    const node = ctaRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty('--cta-x', `${px * 14}px`);
    node.style.setProperty('--cta-y', `${py * 10}px`);
  };

  const handleCtaLeave = () => {
    const node = ctaRef.current;
    if (!node) return;
    node.style.setProperty('--cta-x', '0px');
    node.style.setProperty('--cta-y', '0px');
  };

  useEffect(() => {
    // Fire the real energy-burst effect once on mount, from where the title sits -
    // this is the exact same transition App.jsx fires when switching visualizer pages.
    const t = setTimeout(() => {
      setBurst({ x: window.innerWidth / 2, y: window.innerHeight * 0.38, key: Date.now() });
      sounds.navChange();
    }, 260);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getAnalytics()
      .then((res) => {
        if (cancelled) return;
        const total = (res.mostUsedAlgorithms || []).reduce((sum, a) => sum + (a.totalRuns || 0), 0);
        setRunsLogged(total);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleEnter = (key, event) => {
    if (!auth.isLoggedIn) {
      sounds.click();
      setPendingDestination(key);
      setAuthModalOpen(true);
      return;
    }

    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;
    setBurst({ x, y, key: Date.now() });
    sounds.navChange();
    // Let the burst play for a beat before actually navigating, so it reads as
    // one continuous motion instead of an instant cut.
    setTimeout(() => onEnter(key), 260);
  };

  // Resumes the module entry a guest was blocked from above, right after they
  // finish signing in through the modal.
  useEffect(() => {
    if (!auth.isLoggedIn || !pendingDestination) return;
    const key = pendingDestination;
    setPendingDestination(null);
    setAuthModalOpen(false);
    setBurst({ x: window.innerWidth / 2, y: window.innerHeight / 2, key: Date.now() });
    sounds.navChange();
    setTimeout(() => onEnter(key), 260);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isLoggedIn, pendingDestination]);

  return (
    <div className="landing-page" ref={pageRef} onMouseMove={handlePageMouseMove}>
      <div className="landing-grid-floor" />
      <ParticleField particles={particles} />
      <div className="pixel-noise" />
      <div className="pink-glow pink-glow-one" />
      <div className="pink-glow pink-glow-two" />
      <div className="landing-scanline" />

      <div
        key={burst?.key || 'idle'}
        className={`page-energy-layer ${burst ? 'is-active' : ''}`}
        style={{
          '--energy-x': burst ? `${burst.x}px` : '50vw',
          '--energy-y': burst ? `${burst.y}px` : '38vh',
        }}
      >
        <div className="page-energy-core" />
        <div className="page-energy-ring" />
        <div className="page-energy-scanline" />
        <div className="page-energy-fragments">
          {scanFragments.map((fragment) => (
            <span
              key={fragment}
              className="page-energy-fragment"
              style={{ top: `${14 + (fragment % 10) * 7}%`, animationDelay: `${fragment * 18}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="landing-auth-slot">
        {auth.isLoggedIn ? (
          <>
            <span className="auth-username">{auth.user.username}</span>
            <button type="button" className="pixel-btn ghost auth-btn" onClick={() => { sounds.click(); auth.logout(); }}>LOG OUT</button>
          </>
        ) : (
          <button type="button" className="pixel-btn ghost auth-btn" onClick={() => { sounds.click(); setAuthModalOpen(true); }}>LOG IN</button>
        )}
      </div>

      {authModalOpen && (
        <AuthModal
          auth={auth}
          onClose={() => setAuthModalOpen(false)}
          onCancel={() => setPendingDestination(null)}
          hint={pendingDestination ? 'Sign in to enter this module - your progress and saves stay tied to your account.' : undefined}
        />
      )}

      <header className="landing-hero">
        <BootSequence />

        <div className="landing-hero-title-wrap">
          <p className="eyebrow">PIXEL MODE / DSA VISUALIZER</p>
          <DecodeTitle />
          <p className="subtitle landing-subtitle">
            Nine modules. Real algorithms, real data structures, real database persistence -
            every insert, swap, and traversal actually runs, step by step.
          </p>

          <div className="landing-cta-row">
            <button
              ref={ctaRef}
              className="pixel-btn landing-cta landing-cta-magnetic"
              type="button"
              onClick={(e) => handleEnter('array', e)}
              onPointerMove={handleCtaMove}
              onPointerLeave={handleCtaLeave}
            >
              ▶ ENTER LAB
            </button>
            <button className="pixel-btn ghost" type="button" onClick={(e) => handleEnter('analytics', e)}>
              VIEW LIVE ANALYTICS
            </button>
          </div>
        </div>

        <div className="landing-scroll-cue" aria-hidden="true">
          <span className="landing-scroll-cue-line" />
          <span className="landing-scroll-cue-label">SCROLL</span>
        </div>
      </header>

      <Reveal as="section" className="landing-stats">
        <StatCard digits={9} label="VISUALIZER MODULES" status="STATIC" />
        <StatCard digits={13} label="ALGORITHMS IMPLEMENTED" status="STATIC" />
        <StatCard digits={runsLogged ?? 0} label="RUNS LOGGED TO DATABASE" status={runsLogged === null ? 'SYNC...' : 'LIVE'} />
      </Reveal>

      <Reveal as="section" className="landing-modules">
        <div className="panel-title">SELECT A MODULE</div>
        <div className="landing-module-grid">
          {MODULES.map((m, i) => (
            <ModuleCard key={m.key} module={m} index={i} onEnter={handleEnter} />
          ))}
        </div>
      </Reveal>

      <Reveal as="footer" className="landing-footer">
        <span>SYSTEM READY // REACT + MONGODB-BACKED PERSISTENCE // ALL DATA STRUCTURES LIVE</span>
      </Reveal>
    </div>
  );
}

export default LandingPage;
