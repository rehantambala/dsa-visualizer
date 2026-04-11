function SortingControls({
  algorithm,
  onAlgorithmChange,
  speed,
  onSpeedChange,
  onShuffle,
  onReset,
  onStep,
  onPlayPause,
  isPlaying,
  canStep,
  isComplete,
}) {
  return (
    <section className="control-panel stage-block stage-delay-2 sorting-controls-panel">
      <div className="panel-title">SORTING CONTROLS</div>

      <div className="sorting-controls-grid">
        <div className="field">
          <label>ALGORITHM</label>
          <select value={algorithm} onChange={(event) => onAlgorithmChange(event.target.value)}>
            <option value="bubble">Bubble Sort</option>
            <option value="selection">Selection Sort</option>
            <option value="insertion">Insertion Sort</option>
            <option value="merge">Merge Sort</option>
            <option value="quick">Quick Sort</option>
            <option value="heap">Heap Sort</option>
          </select>
        </div>

        <div className="field">
          <label>SPEED (MS)</label>
          <input
            type="range"
            min="80"
            max="1200"
            step="20"
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          />
        </div>

        <button className="pixel-btn" type="button" onClick={onShuffle}>
          SHUFFLE
        </button>

        <button className="pixel-btn ghost" type="button" onClick={onReset}>
          RESET
        </button>

        <button className="pixel-btn" type="button" onClick={onStep} disabled={!canStep || isPlaying}>
          STEP
        </button>

        <button
          className="pixel-btn"
          type="button"
          onClick={onPlayPause}
          disabled={!canStep && !isPlaying && isComplete}
        >
          {isPlaying ? "PAUSE" : "AUTO PLAY"}
        </button>
      </div>
    </section>
  );
}

export default SortingControls;
