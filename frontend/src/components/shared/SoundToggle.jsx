/**
 * frontend/src/components/shared/SoundToggle.jsx
 *
 * Global mute / volume control for the synthesized sound engine
 * (../utils/audioEngine.js). Sits in the topbar next to the auth controls so
 * it's reachable from every visualizer. Styled to match the black / pink
 * pixel-mono theme (see ./sound-toggle.css).
 */
import { useEffect, useRef, useState } from "react";
import { useSound } from "../../hooks/useSound.js";
import "./sound-toggle.css";

function SoundToggle() {
  const { muted, volume, toggle, setVolume } = useSound();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div className="sound-toggle" ref={wrapRef}>
      <button
        type="button"
        className="pixel-btn ghost auth-btn sound-toggle-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={muted ? "Sound is muted" : "Sound is on"}
        title={muted ? "Sound muted" : "Sound on"}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" />
            <path d="M16.5 8.5l5 7M21.5 8.5l-5 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" />
            <path
              d="M16.2 8.8a5 5 0 0 1 0 6.4M18.6 6.4a8.5 8.5 0 0 1 0 11.2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="sound-popover">
          <div className="sound-popover-row">
            <span className="sound-popover-label">SOUND</span>
            <button type="button" className="sound-mute-btn" onClick={toggle}>
              {muted ? "UNMUTE" : "MUTE"}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            disabled={muted}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="sound-volume-slider"
            aria-label="Volume"
          />
        </div>
      )}
    </div>
  );
}

export default SoundToggle;
