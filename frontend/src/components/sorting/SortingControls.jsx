import React from 'react';

const SortingControls = ({ 
  onGenerate, 
  onPlay, 
  onPause, 
  onStepForward, 
  isRunning, 
  speed, 
  setSpeed,
  hasSteps
}) => {
  return (
    <div className="info-card controls-panel" style={{ display: 'flex', gap: '15px', padding: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
      
      <button className="pixel-btn" disabled={isRunning} onClick={() => onGenerate(15, 'random')}>
        GENERATE ARRAY
      </button>

      <div style={{ borderLeft: '1px solid #333', height: '30px', margin: '0 10px' }} />

      <button 
        className="pixel-btn" 
        style={{ borderColor: isRunning ? '#333' : 'var(--pink-glow)' }}
        disabled={!hasSteps || isRunning} 
        onClick={onPlay}
      >
        RUN
      </button>

      <button className="pixel-btn" disabled={!isRunning} onClick={onPause}>
        PAUSE
      </button>

      <button className="pixel-btn" disabled={isRunning || !hasSteps} onClick={onStepForward}>
        STEP {'>'}
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>SPEED: {speed}x</span>
        <input 
          type="range" 
          min="0.25" max="2" step="0.25" 
          value={speed} 
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          style={{ accentColor: 'var(--pink-glow)', width: '100px' }}
        />
      </div>

    </div>
  );
};

export default SortingControls;