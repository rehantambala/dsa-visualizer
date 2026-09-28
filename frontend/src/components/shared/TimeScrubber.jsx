// frontend/src/components/shared/TimeScrubber.jsx
import React from 'react';

function TimeScrubber({ history = [], selectedHistoryId, onScrub }) {
  if (history.length <= 1) return null; // Don't show if there's no history to scrub through

  // Find where we currently are in the timeline
  const currentIndex = history.findIndex((item) => item.id === selectedHistoryId);
  const displayIndex = currentIndex === -1 ? history.length - 1 : currentIndex;
  
  const currentLabel = history[displayIndex]?.label || "IDLE";

  return (
    <div className="info-card time-scrubber-panel" style={{ marginTop: '20px', padding: '15px' }}>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>TIMELINE SCRUBBER</span>
        <span style={{ color: 'var(--pink-glow)' }}>{currentLabel}</span>
      </div>
      
      <div className="scrubber-track" style={{ margin: '15px 0' }}>
        <input 
          type="range" 
          min="0" 
          max={history.length - 1} 
          value={displayIndex}
          onChange={(e) => {
            const selectedItem = history[e.target.value];
            onScrub(selectedItem);
          }}
          style={{
            width: '100%',
            cursor: 'ew-resize',
            accentColor: '#ff2a7a', // The signature pink glow
            height: '4px',
            backgroundColor: '#333',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888', letterSpacing: '1px' }}>
        <span>[ SYSTEM BOOT ]</span>
        <span>[ LATEST STATE ]</span>
      </div>
    </div>
  );
}

export default TimeScrubber;