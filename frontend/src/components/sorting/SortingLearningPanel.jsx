/**
 * src/components/sorting/SortingLearningPanel.jsx
 *
 * Renders three info cards inside the sorting-learning-grid:
 *   1. Algorithm Note — description of the current algorithm
 *   2. Live Stats — step count, compare ops, swap ops (using PixelNumber)
 *   3. Complexity — time/space/mode, with the live message below
 *
 * Layout is handled by .sorting-learning-grid in index.css (the standalone
 * sorting.css file was dead code - never imported anywhere - and has been removed).
 */

import PixelNumber from "../shared/PixelNumber.jsx";

const SORTING_NOTES = {
  bubble:    "Repeatedly compare adjacent values and swap if out of order. The largest unsorted value bubbles to the right each pass.",
  selection: "Scan the unsorted region for the minimum value, then place it at the next sorted position.",
  insertion: "Grow a sorted left partition by picking each new value and inserting it into its correct position.",
  merge:     "Recursively split the array in half, then merge sorted halves by writing back the smallest pending value.",
  quick:     "Pick a pivot, partition so smaller values are left and larger are right, then recurse on both sides.",
  heap:      "Build a max-heap from the input, then repeatedly extract the max to the sorted tail and re-heapify.",
};

const COMPLEXITY = {
  bubble:    { time: "O(n²)",          space: "O(1)" },
  selection: { time: "O(n²)",          space: "O(1)" },
  insertion: { time: "O(n²)",          space: "O(1)" },
  merge:     { time: "O(n log n)",     space: "O(n)" },
  quick:     { time: "O(n log n) avg", space: "O(log n)" },
  heap:      { time: "O(n log n)",     space: "O(1)" },
};

function StatRow({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <PixelNumber value={value} active />
    </div>
  );
}

function SortingLearningPanel({
  algorithm,
  stepIndex,
  totalSteps,
  message,
  comparedCount,
  swapCount,
}) {
  const cx = COMPLEXITY[algorithm] || COMPLEXITY.bubble;

  return (
    <>
      {/* Card 1 — Algorithm note */}
      <div className="info-card">
        <div className="panel-title">ALGORITHM NOTE</div>
        <p className="sorting-note">{SORTING_NOTES[algorithm]}</p>
      </div>

      {/* Card 2 — Live stats */}
      <div className="info-card">
        <div className="panel-title">LIVE STATS</div>
        <div className="sorting-stats-list">
          <StatRow label="STEP"         value={stepIndex}     />
          <StatRow label="TOTAL STEPS"  value={totalSteps}    />
          <StatRow label="COMPARES"     value={comparedCount} />
          <StatRow label="SWAPS/WRITES" value={swapCount}     />
        </div>
      </div>

      {/* Card 3 — Complexity + live message */}
      <div className="info-card">
        <div className="panel-title">COMPLEXITY</div>
        <div className="complexity-list">
          <div>TIME&nbsp;&nbsp;: {cx.time}</div>
          <div>SPACE : {cx.space}</div>
          <div>MODE&nbsp;&nbsp;: STEP + AUTO PLAY</div>
        </div>
        {message && (
          <p className="sorting-note">
            <span className="sorting-note-message">{message}</span>
          </p>
        )}
      </div>
    </>
  );
}

export default SortingLearningPanel;