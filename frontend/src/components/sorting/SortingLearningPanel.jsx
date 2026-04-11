import PixelNumber from "../shared/PixelNumber.jsx";

const SORTING_NOTES = {
  bubble: "Repeatedly compare adjacent values and swap if out of order. Largest values bubble right.",
  selection: "Pick the smallest remaining value and place it at the next sorted index.",
  insertion: "Grow a sorted left side by inserting each new value into its correct position.",
  merge: "Split recursively, then merge sorted halves by writing back the smallest pending value.",
  quick: "Partition around a pivot so smaller values move left and larger values move right.",
  heap: "Build a max heap, then repeatedly move max to the end and re-heapify.",
};

const COMPLEXITY = {
  bubble: "O(n²)",
  selection: "O(n²)",
  insertion: "O(n²)",
  merge: "O(n log n)",
  quick: "O(n log n) avg",
  heap: "O(n log n)",
};

function SortingLearningPanel({ algorithm, stepIndex, totalSteps, message, comparedCount, swapCount }) {
  return (
    <section className="dashboard-grid stage-block stage-delay-4 sorting-learning-grid">
      <div className="info-card">
        <div className="panel-title">ALGORITHM NOTE</div>
        <p className="sorting-note">{SORTING_NOTES[algorithm]}</p>
      </div>

      <div className="info-card">
        <div className="panel-title">LIVE STATS</div>
        <div className="sorting-stats-list">
          <div className="info-row">
            <span>STEP</span>
            <PixelNumber value={stepIndex} active />
          </div>
          <div className="info-row">
            <span>TOTAL STEPS</span>
            <PixelNumber value={totalSteps} active />
          </div>
          <div className="info-row">
            <span>COMPARE OPS</span>
            <PixelNumber value={comparedCount} active />
          </div>
          <div className="info-row">
            <span>SWAP/WRITE OPS</span>
            <PixelNumber value={swapCount} active />
          </div>
        </div>
      </div>

      <div className="info-card">
        <div className="panel-title">COMPLEXITY</div>
        <div className="complexity-list">
          <div>TIME : {COMPLEXITY[algorithm]}</div>
          <div>SPACE : algorithm dependent</div>
          <div>MODE : STEP + AUTO PLAY</div>
        </div>
        <p className="sorting-note sorting-note-message">{message}</p>
      </div>
    </section>
  );
}

export default SortingLearningPanel;
