/**
 * frontend/src/components/sorting/SortingVisualizer.jsx
 *
 * Sorting Visualizer page.
 * Architecture matches every other visualizer:
 *   hero → controls → visual stage → dashboard grid → learning panel
 *
 * Uses SortBlock for rendering, useSortPlayer for playback.
 * App.jsx already imports this and renders it on mode === "sorting".
 */

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SortBlock from "./SortBlock.jsx";
import useSortPlayer from "./useSortPlayer.js";
import {
  bubbleSortSteps,
  selectionSortSteps,
  insertionSortSteps,
  mergeSortSteps,
  quickSortSteps,
} from "../../algorithms/sortingStepEngine.js";
import { logRun } from "../../utils/logRun.js";

/* ─── static data ────────────────────────────────────────────────────────── */

const ALGORITHMS = [
  { key: "bubble",    label: "BUBBLE"    },
  { key: "selection", label: "SELECTION" },
  { key: "insertion", label: "INSERTION" },
  { key: "merge",     label: "MERGE"     },
  { key: "quick",     label: "QUICK"     },
];

const COMPLEXITY = {
  bubble:    { best: "O(n)",   avg: "O(n²)",    worst: "O(n²)",    space: "O(1)",    stable: "Yes" },
  selection: { best: "O(n²)",  avg: "O(n²)",    worst: "O(n²)",    space: "O(1)",    stable: "No"  },
  insertion: { best: "O(n)",   avg: "O(n²)",    worst: "O(n²)",    space: "O(1)",    stable: "Yes" },
  merge:     { best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "Yes" },
  quick:     { best: "O(n log n)", avg: "O(n log n)", worst: "O(n²)",      space: "O(log n)", stable: "No" },
};

const LEARN = {
  bubble: {
    title: "BUBBLE SORT",
    how: "Repeatedly walks through the array comparing adjacent pairs and swapping them if out of order. Each pass 'bubbles' the largest unsorted value to its final position.",
    when: "Teaching and nearly-sorted tiny arrays. An early-exit flag makes it O(n) best-case. Rarely used in production.",
  },
  selection: {
    title: "SELECTION SORT",
    how: "Splits the array into sorted (left) and unsorted (right) halves. Each pass scans the unsorted half for the minimum value, then moves it into the sorted section.",
    when: "When write cost is high — it performs exactly n−1 swaps regardless of input order. Consistent O(n²) means it loses to insertion sort on nearly-sorted data.",
  },
  insertion: {
    title: "INSERTION SORT",
    how: "Builds the sorted array one element at a time. Each new element is shifted left until it sits in the correct position — like sorting playing cards in your hand.",
    when: "Small arrays, nearly-sorted data, and as the base case in Timsort / Introsort. Adaptive: O(n) best case.",
  },
  merge: {
    title: "MERGE SORT",
    how: "Recursively divides the array in half, sorts each half, then merges the two sorted halves back together in linear time.",
    when: "When stability matters or worst-case O(n log n) is required. Preferred for linked lists. Extra O(n) space is the trade-off.",
  },
  quick: {
    title: "QUICK SORT",
    how: "Picks a pivot, partitions the array so everything smaller is left and larger is right, then recurse on each side. The pivot ends up in its final sorted position.",
    when: "General-purpose sorting — fastest average-case in practice. O(n log n) average, O(n²) worst (mitigated by random pivot). In-place with O(log n) stack space.",
  },
};

const DEFAULT_ARRAY = [38, 12, 55, 7, 29, 44, 18, 63];

function randomArray(size = 8) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 88) + 8);
}

function generateSteps(algo, arr) {
  switch (algo) {
    case "bubble":    return bubbleSortSteps(arr);
    case "selection": return selectionSortSteps(arr);
    case "insertion": return insertionSortSteps(arr);
    case "merge":     return mergeSortSteps(arr);
    case "quick":     return quickSortSteps(arr);
    default:          return [];
  }
}

/* ─── component ──────────────────────────────────────────────────────────── */

export default function SortingVisualizer() {
  /* source of truth — the "input" array before any sort */
  const [sourceArray, setSourceArray]   = useState([...DEFAULT_ARRAY]);
  const [inputText,   setInputText]     = useState(DEFAULT_ARRAY.join(", "));
  const [algo,        setAlgo]          = useState("bubble");
  const [speed,       setSpeed]         = useState("medium");

  /* steps are generated fresh each time the user presses SORT */
  const [steps,  setSteps]  = useState([]);
  const [locked, setLocked] = useState(false); // true while a sort is loaded/running

  /* history */
  const [history,           setHistory]           = useState([{ id: 1, label: "init", snapshot: [...DEFAULT_ARRAY] }]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(1);

  const addHistory = useCallback((label, snapshot) => {
    setHistory((prev) => {
      const nextId = prev.length > 0 ? prev[0].id + 1 : 1;
      const next   = [{ id: nextId, label, snapshot: [...snapshot] }, ...prev].slice(0, 12);
      setSelectedHistoryId(nextId);
      return next;
    });
  }, []);

  /* player hook */
  const {
    displayArray, blockStates, rangeIndices,
    stats, status, message, stepIndex, totalSteps,
    play, pause, stepForward, reset: playerReset,
  } = useSortPlayer(steps, sourceArray, speed);

  /* ── derived ── */
  const cx       = COMPLEXITY[algo];
  const learn    = LEARN[algo];
  const isDone   = status === "done";
  const isRunning= status === "running";
  const progress = totalSteps > 0 ? Math.min(100, (stepIndex / totalSteps) * 100) : 0;

  /* ── handlers ── */
  const handleSort = useCallback(() => {
    const generated = generateSteps(algo, sourceArray);
    setSteps(generated);
    setLocked(true);
    // play() is called after steps are set — use a tiny delay so state settles
    setTimeout(play, 0);
    addHistory(`sort(${algo})`, sourceArray);
    logRun({ algorithm: algo, visualizer: "Sorting", inputSize: sourceArray.length, steps: generated.length });
  }, [algo, sourceArray, play, addHistory]);

  const handleReset = useCallback(() => {
    playerReset();
    setSteps([]);
    setLocked(false);
  }, [playerReset]);

  const handleCreate = useCallback(() => {
    const parts = inputText
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0)
      .slice(0, 12);

    if (parts.length < 2) return;
    setSourceArray(parts);
    setInputText(parts.join(", "));
    setSteps([]);
    setLocked(false);
    playerReset();
    addHistory(`create [${parts.join(", ")}]`, parts);
  }, [inputText, playerReset, addHistory]);

  const handleRandomize = useCallback(() => {
    const r = randomArray(8);
    setSourceArray(r);
    setInputText(r.join(", "));
    setSteps([]);
    setLocked(false);
    playerReset();
    addHistory("randomize()", r);
  }, [playerReset, addHistory]);

  const handleAlgoChange = useCallback((key) => {
    setAlgo(key);
    setSteps([]);
    setLocked(false);
    playerReset();
  }, [playerReset]);

  const handleRestoreHistory = useCallback((item) => {
    setSourceArray(item.snapshot);
    setInputText(item.snapshot.join(", "));
    setSteps([]);
    setLocked(false);
    playerReset();
    setSelectedHistoryId(item.id);
  }, [playerReset]);

  /* ── render ── */
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / SORT LAB</p>
        <h1>SORTING VISUALIZER</h1>
        <p className="subtitle">
          Pick an algorithm, load an array, then step through every compare and
          swap — block by block. Restore any past state from history.
        </p>
      </section>

      {/* ── ALGORITHM / ARRAY INPUT ──────────────────────────── */}
      <section className="control-panel stage-block stage-delay-2">
        <div className="panel-title">ALGORITHM / INPUT</div>

        {/* algo picker */}
        <div className="sort-algo-strip">
          {ALGORITHMS.map((a) => (
            <button
              key={a.key}
              type="button"
              className={`pixel-btn sort-algo-btn ${algo === a.key ? "sort-algo-btn--active" : ""}`}
              onClick={() => handleAlgoChange(a.key)}
              disabled={isRunning}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* array input row */}
        <div className="sort-input-row">
          <div className="field" style={{ flex: 1 }}>
            <label>ARRAY (comma-separated, max 12)</label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. 38, 12, 55, 7"
              disabled={isRunning}
            />
          </div>
          <button className="pixel-btn" onClick={handleCreate}    disabled={isRunning} type="button">CREATE</button>
          <button className="pixel-btn" onClick={handleRandomize} disabled={isRunning} type="button">RANDOM</button>
        </div>
      </section>

      {/* ── PLAYBACK CONTROLS ────────────────────────────────── */}
      <section className="control-panel stage-block stage-delay-3">
        <div className="panel-title">PLAYBACK</div>
        <div className="sort-playback-row">

          {/* primary action */}
          {!locked ? (
            <button className="pixel-btn" onClick={handleSort} type="button">
              ▶ SORT
            </button>
          ) : isRunning ? (
            <button className="pixel-btn" onClick={pause} type="button">
              ⏸ PAUSE
            </button>
          ) : isDone ? (
            <button className="pixel-btn ghost" onClick={handleReset} type="button">
              ↺ NEW SORT
            </button>
          ) : (
            <button className="pixel-btn" onClick={play} type="button">
              ▶ RESUME
            </button>
          )}

          {/* step forward — disabled while auto-running */}
          <button
            className="pixel-btn ghost"
            onClick={stepForward}
            disabled={isRunning || isDone || !locked}
            type="button"
          >
            ⏭ STEP
          </button>

          <button
            className="pixel-btn ghost"
            onClick={handleReset}
            disabled={isRunning}
            type="button"
          >
            ↺ RESET
          </button>

          {/* speed group */}
          <div className="sort-speed-group">
            <span className="sort-speed-label">SPEED</span>
            {["slow", "medium", "fast"].map((s) => (
              <button
                key={s}
                type="button"
                className={`pixel-btn sort-speed-btn ${speed === s ? "sort-speed-btn--active" : ""}`}
                onClick={() => setSpeed(s)}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── SORT STAGE ───────────────────────────────────────── */}
      <section className="visual-panel stage-block stage-delay-4">
        <div className="visual-header">
          <div className="panel-title">SORT STAGE</div>
          <motion.div
            key={message}
            className="visual-hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {message}
          </motion.div>
        </div>

        {/* range indicator strip (merge/quick) */}
        <AnimatePresence>
          {rangeIndices && (
            <motion.div
              className="sort-range-bar"
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0 }}
              style={{
                "--range-lo": rangeIndices[0],
                "--range-hi": rangeIndices[1],
                "--block-count": displayArray.length,
              }}
            />
          )}
        </AnimatePresence>

        {/* blocks */}
        <div className="sort-stage">
          {displayArray.map((val, i) => (
            <SortBlock
              key={i}
              layoutId={`sb-${i}`}
              value={val}
              state={blockStates[i] ?? "idle"}
              index={i}
            />
          ))}
        </div>

        {/* progress bar */}
        <div className="sort-progress-track">
          <motion.div
            className="sort-progress-fill"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.18 }}
          />
        </div>
        <div className="sort-progress-label">
          STEP {stepIndex} / {totalSteps}
        </div>
      </section>

      {/* ── DASHBOARD ────────────────────────────────────────── */}
      <section className="dashboard-grid stage-block stage-delay-5">

        {/* run stats */}
        <div className="info-card">
          <div className="panel-title">RUN STATS</div>
          <div className="info-list">
            <div className="info-row"><span>ALGORITHM</span><strong>{algo.toUpperCase()}</strong></div>
            <div className="info-row"><span>COMPARISONS</span><strong style={{ color: "var(--pink)" }}>{stats.cmp}</strong></div>
            <div className="info-row"><span>SWAPS</span><strong style={{ color: "var(--pink)" }}>{stats.swap}</strong></div>
            <div className="info-row"><span>PASS</span><strong>{stats.pass || "—"}</strong></div>
            <div className="info-row">
              <span>STATUS</span>
              <strong>{status.toUpperCase()}</strong>
            </div>
          </div>
        </div>

        {/* complexity + legend */}
        <div className="info-card">
          <div className="panel-title">COMPLEXITY</div>
          <div className="complexity-list">
            <div>BEST&nbsp;&nbsp;&nbsp;: {cx.best}</div>
            <div>AVERAGE: {cx.avg}</div>
            <div>WORST&nbsp;&nbsp;: {cx.worst}</div>
            <div>SPACE&nbsp;&nbsp;: {cx.space}</div>
            <div>STABLE&nbsp;: {cx.stable}</div>
          </div>

          <div className="panel-title" style={{ marginTop: 20 }}>LEGEND</div>
          <div className="sort-legend">
            {[
              { cls: "compare", label: "COMPARING"  },
              { cls: "swap",    label: "SWAPPING"   },
              { cls: "pivot",   label: "PIVOT"       },
              { cls: "sorted",  label: "SORTED"      },
              { cls: "idle",    label: "UNSORTED"    },
            ].map(({ cls, label }) => (
              <div key={cls} className="sort-legend-row">
                <div className={`sort-legend-swatch sort-legend-swatch--${cls}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* history */}
        <div className="info-card">
          <div className="panel-title">HISTORY (CLICK TO RESTORE)</div>
          <div className="history-list">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`history-item ${selectedHistoryId === item.id ? "is-selected" : ""}`}
                onClick={() => handleRestoreHistory(item)}
              >
                <span className="history-label">{item.label}</span>
                <span className="history-snapshot">[{item.snapshot.join(", ")}]</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEARNING PANEL ───────────────────────────────────── */}
      <section className="control-panel stage-block stage-delay-5" style={{ marginTop: 0 }}>
        <div className="panel-title">HOW IT WORKS — {learn.title}</div>
        <div className="sort-learn-grid">
          <div className="sort-learn-card">
            <div className="sort-learn-title">ALGORITHM</div>
            <p>{learn.how}</p>
          </div>
          <div className="sort-learn-card">
            <div className="sort-learn-title">WHEN TO USE</div>
            <p>{learn.when}</p>
          </div>
        </div>
      </section>
    </>
  );
}