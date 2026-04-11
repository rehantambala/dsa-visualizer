function DebuggerControls({ onStepForward, onStepBack, onPause, onAutoPlay, isPlaying }) {
  return (
    <div className="sorting-controls-grid">
      <button className="pixel-btn" type="button" onClick={onStepBack}>STEP BACK</button>
      <button className="pixel-btn" type="button" onClick={onStepForward}>STEP FORWARD</button>
      <button className="pixel-btn ghost" type="button" onClick={onPause}>PAUSE</button>
      <button className="pixel-btn" type="button" onClick={onAutoPlay}>{isPlaying ? 'PLAYING...' : 'AUTO PLAY'}</button>
    </div>
  );
}

export default DebuggerControls;
