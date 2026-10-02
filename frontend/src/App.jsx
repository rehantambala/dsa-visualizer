/**
 * frontend/src/App.jsx
 *
 * What this file is for:
 * - App shell: landing/auth gate, top navigation, and the futuristic
 *   page-switch transition between visualizer modules.
 * - Every module (Array, Stack, Queue, Linked List, Sorting, Graph, Tree,
 *   Pathfinding, Analytics) owns its own state/logic in its own component -
 *   this file only owns which one is currently displayed and the transition
 *   between them.
 *
 * What it connects to:
 * - Renders one of the per-module Visualizer components based on `mode`
 *
 * What it displays:
 * - top navigation
 * - the active visualizer module
 * - nav-origin transition pulse and staged page reveal
 */

import { useEffect, useRef, useState } from "react";
import ArrayVisualizer from "./components/array/ArrayVisualizer.jsx";
import StackVisualizer from "./components/stack/StackVisualizer.jsx";
import QueueVisualizer from "./components/queue/QueueVisualizer.jsx";
import LinkedListVisualizer from "./components/linkedlist/LinkedListVisualizer.jsx";
import SortingVisualizer from "./components/sorting/SortingVisualizer.jsx";
import GraphVisualizer from "./components/graph/GraphVisualizer.jsx";
import BinaryTreeVisualizer from "./components/tree/BinaryTreeVisualizer.jsx";
import PathfindingVisualizer from "./components/pathfinding/PathfindingVisualizer.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import LandingPage from "./components/landing/LandingPage.jsx";
import AuthModal from "./components/auth/AuthModal.jsx";
import IntroScreen from "./components/intro/IntroScreen.jsx";
import SoundToggle from "./components/shared/SoundToggle.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { useSound } from "./hooks/useSound.js";
import "./components/graph/graph.css";

const SESSION_GATE_MS = 400;
const NO_HANDOFF = { landing: false, brand: true };

function App() {
  const auth = useAuth();
  const { sounds } = useSound();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // App used to open straight into the Array visualizer. "view" gates a landing
  // page in front of everything else - entering a module from a card (or the nav
  // brand) just flips this to "app" and sets the target mode.
  const [view, setView] = useState("landing");
  const [mode, setMode] = useState("array");
  const [displayMode, setDisplayMode] = useState("array");
  const [transitionPhase, setTransitionPhase] = useState("idle");
  const [transitionOrigin, setTransitionOrigin] = useState({ x: 0, y: 0 });
  // Logged-out users get the intro/login screen instead of the landing page.
  // It closes itself (onDone) after its success sequence - useAuth flips
  // isLoggedIn the moment the API answers, so while the panel is mid-submit
  // (introBusy) that flip must not yank the screen away. A login that didn't
  // come through the panel (api.me() confirming a cookie) closes it at once.
  const [introOpen, setIntroOpen] = useState(() => !auth.isLoggedIn);
  const introBusy = useRef(false);
  // While the first session check is in flight, show only the blank dot-grid
  // background (max SESSION_GATE_MS) so a valid cookie never flashes the
  // intro and an expired one never flashes the landing page.
  const [gateExpired, setGateExpired] = useState(false);
  const [handoff, setHandoff] = useState(NO_HANDOFF);

  const handleModeChange = (nextMode, event) => {
    if (nextMode === mode || transitionPhase !== "idle") return;

    sounds.navChange();
    const rect = event.currentTarget.getBoundingClientRect();
    setTransitionOrigin({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });

    setMode(nextMode);
    setTransitionPhase("out");

    window.clearTimeout(window.__pageSwitchMidTimeout__);
    window.clearTimeout(window.__pageSwitchDoneTimeout__);

    window.__pageSwitchMidTimeout__ = window.setTimeout(() => {
      setDisplayMode(nextMode);
      setTransitionPhase("in");
    }, 240);

    window.__pageSwitchDoneTimeout__ = window.setTimeout(() => {
      setTransitionPhase("idle");
    }, 840);
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(window.__pageSwitchMidTimeout__);
      window.clearTimeout(window.__pageSwitchDoneTimeout__);
    };
  }, []);

  // Every module is gated behind login (see LandingPage.jsx's handleEnter) -
  // if the session ends while inside the app (logout, or an expired cookie
  // caught by useAuth's own checks), send the user back to the landing page's
  // gate instead of leaving them stranded inside a module with no account.
  useEffect(() => {
    if (view === "app" && !auth.isLoggedIn) {
      setView("landing");
    }
  }, [auth.isLoggedIn, view]);

  useEffect(() => {
    const t = window.setTimeout(() => setGateExpired(true), SESSION_GATE_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!auth.isLoggedIn) { setIntroOpen(true); setHandoff(NO_HANDOFF); }
    else if (!introBusy.current) setIntroOpen(false);
  }, [auth.isLoggedIn]);

  // The nav is a single horizontally-scrolling row; keep the active tab in
  // view (centred) whenever the module changes.
  useEffect(() => {
    if (view !== "app") return;
    const active = document.querySelector(".nav-link.active");
    const nav = active?.parentElement;
    if (!active || !nav) return;
    nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2 });
  }, [mode, view]);

  const scanFragments = Array.from({ length: 20 }, (_, indexValue) => indexValue);

  const renderActivePage = () => {
    if (displayMode === "array") {
      return <ArrayVisualizer pagePhase={transitionPhase} />;
    }

    if (displayMode === "stack") {
      return <StackVisualizer pagePhase={transitionPhase} />;
    }

    if (displayMode === "queue") {
      return <QueueVisualizer pagePhase={transitionPhase} />;
    }

    if (displayMode === "linked-list") {
      return <LinkedListVisualizer pagePhase={transitionPhase} />;
    }
    if (displayMode === "sorting") {
    return <SortingVisualizer pagePhase={transitionPhase} />;
  }

    if (displayMode === "graph") {
      return <GraphVisualizer pagePhase={transitionPhase} />;
    }

    if (displayMode === "tree") {
      return <BinaryTreeVisualizer pagePhase={transitionPhase} />;
    }

    if (displayMode === "pathfinding") {
      return <PathfindingVisualizer pagePhase={transitionPhase} />;
    }

    if (displayMode === "analytics") {
      return <AnalyticsDashboard pagePhase={transitionPhase} />;
    }

  };

  const handleEnter = (targetMode) => {
    setMode(targetMode);
    setDisplayMode(targetMode);
    setTransitionPhase("idle");
    setView("app");
  };

  if (auth.checking && !gateExpired) {
    return <div className="ix" aria-hidden="true" />;
  }

  // Intro and landing render side by side during the entry transition: the
  // intro mounts the landing underneath at its "traverse" step (onReveal),
  // flies its pixel into the landing's brand (onBrandOn), then unmounts
  // (onDone). Same element order before and after, so the landing never
  // remounts at the handoff. .landing-layer is its own stacking context below
  // the intro's #portal/#sing overlays.
  if (introOpen || view === "landing") {
    const showLanding = !introOpen || handoff.landing;
    return (
      <>
        {showLanding && (
          <div className="landing-layer">
            <LandingPage onEnter={handleEnter} auth={auth} brandVisible={!introOpen || handoff.brand} entrance={introOpen} />
          </div>
        )}
        {introOpen && (
          <IntroScreen
            auth={auth}
            onBusyChange={(busy) => { introBusy.current = busy; }}
            onReveal={() => setHandoff({ landing: true, brand: false })}
            onBrandOn={() => setHandoff((h) => ({ ...h, brand: true }))}
            onDone={() => { introBusy.current = false; setIntroOpen(false); setHandoff(NO_HANDOFF); }}
          />
        )}
      </>
    );
  }

  return (
    <div className="app-shell">
      <div className="pixel-noise" />
      <div className="pink-glow pink-glow-one" />
      <div className="pink-glow pink-glow-two" />

      <div
        className={`page-energy-layer ${transitionPhase !== "idle" ? "is-active" : ""}`}
        style={{
          "--energy-x": `${transitionOrigin.x}px`,
          "--energy-y": `${transitionOrigin.y}px`,
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
              style={{
                top: `${14 + (fragment % 10) * 7}%`,
                animationDelay: `${fragment * 18}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <header className="topbar">
        <button type="button" className="brand" onClick={() => setView("landing")} style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", color: "inherit" }}>
          DSA VISUALIZER
        </button>

        <nav className="nav">
          <button
            className={`nav-link ${mode === "array" ? "active" : ""}`}
            onClick={(event) => handleModeChange("array", event)}
            type="button"
          >
            ARRAY
          </button>

          <button
            className={`nav-link ${mode === "stack" ? "active" : ""}`}
            onClick={(event) => handleModeChange("stack", event)}
            type="button"
          >
            STACK
          </button>

          <button
            className={`nav-link ${mode === "queue" ? "active" : ""}`}
            onClick={(event) => handleModeChange("queue", event)}
            type="button"
          >
            QUEUE
          </button>

          <button
            className={`nav-link ${mode === "linked-list" ? "active" : ""}`}
            onClick={(event) => handleModeChange("linked-list", event)}
            type="button"
          >
            LINKED LIST
          </button>
          <button
           className={`nav-link ${mode === "sorting" ? "active" : ""}`}
           onClick={(event) => handleModeChange("sorting", event)}
            type="button"
          >
  SORTING
</button>
          <button
           className={`nav-link ${mode === "graph" ? "active" : ""}`}
           onClick={(event) => handleModeChange("graph", event)}
            type="button"
          >
  GRAPH
</button>
          <button
           className={`nav-link ${mode === "tree" ? "active" : ""}`}
           onClick={(event) => handleModeChange("tree", event)}
            type="button"
          >
  TREE
</button>
          <button
           className={`nav-link ${mode === "pathfinding" ? "active" : ""}`}
           onClick={(event) => handleModeChange("pathfinding", event)}
            type="button"
          >
  PATHFINDING
</button>
          <button
           className={`nav-link ${mode === "analytics" ? "active" : ""}`}
           onClick={(event) => handleModeChange("analytics", event)}
            type="button"
          >
  ANALYTICS
</button>
        </nav>
        <div className="auth-slot">
          <SoundToggle />
          {auth.isLoggedIn ? (
            <>
              <span className="auth-username">{auth.user.username}</span>
              <button type="button" className="pixel-btn ghost auth-btn" onClick={auth.logout}>LOG OUT</button>
            </>
          ) : (
            <button type="button" className="pixel-btn ghost auth-btn" onClick={() => setAuthModalOpen(true)}>LOG IN</button>
          )}
        </div>
      </header>

      {authModalOpen && <AuthModal auth={auth} onClose={() => setAuthModalOpen(false)} />}

      <main className={`page page-transition-${transitionPhase}`}>
        <div key={displayMode} className={`page-mode-shell page-mode-shell-${transitionPhase}`}>
          {renderActivePage()}
        </div>
      </main>
    </div>
  );
}

export default App;
