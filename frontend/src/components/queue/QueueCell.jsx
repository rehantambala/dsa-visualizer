/**
 * frontend/src/components/queue/QueueCell.jsx
 *
 * What this file is for:
 * - Renders one clickable queue cartridge in a queue-specific machine style.
 * - Handles visual states like selected, active, traversed, found, scan, front, rear, enqueue, and dequeue.
 *
 * What it connects to:
 * - Uses ../shared/PixelNumber.jsx to display the queue value in pixel digits
 *
 * What it displays:
 * - one queue cartridge
 * - value chamber
 * - role pills
 * - index label
 */

import PixelNumber from "../shared/PixelNumber.jsx";

function QueueCell({
  index,
  value,
  isFront = false,
  isRear = false,
  active = false,
  hovered = false,
  selected = false,
  traversed = false,
  found = false,
  scanning = false,
  focusLocked = false,
  actionType = "idle",
  onMouseEnter,
  onMouseLeave,
  onClick,
}) {
  const pixels = Array.from({ length: 32 });

  const statusChip = found
    ? "FOUND"
    : focusLocked
      ? "LOCK"
      : active || scanning
        ? "SCAN"
        : isFront
          ? "FRONT"
          : isRear
            ? "REAR"
            : `Q${index}`;

  return (
    <div className="queue-cell-wrap">
      <button
        type="button"
        className={[
          "queue-cell",
          isFront ? "is-front" : "",
          isRear ? "is-rear" : "",
          active ? "is-active" : "",
          hovered ? "is-hovered" : "",
          selected ? "is-selected" : "",
          traversed ? "is-traversed" : "",
          found ? "is-found" : "",
          scanning ? "is-scanning" : "",
          focusLocked ? "is-focus-locked" : "",
          actionType === "enqueue" ? "is-pending-enqueue" : "",
          actionType === "dequeue" ? "is-pending-dequeue" : "",
          actionType === "peek" ? "is-pending-peek" : "",
        ].join(" ")}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        aria-label={`Queue cell ${index} with value ${value}`}
      >
        <div className="queue-cell-aura" />

        <div className="queue-cell-pixel-grid">
          {pixels.map((_, pixelIndex) => (
            <span key={pixelIndex} className="queue-cell-pixel" />
          ))}
        </div>

        <div className="queue-cell-shell-left" />
        <div className="queue-cell-shell-right" />

        <div className="queue-cell-content">
          <div className="queue-cell-topline">
            <div className="queue-cell-chip">{statusChip}</div>
            <div className="queue-cell-mini-index">#{index}</div>
          </div>

          <div className="queue-cell-role-row">
            {isFront ? <span className="queue-role-pill">OLDEST</span> : null}
            {isRear ? <span className="queue-role-pill rear">NEWEST</span> : null}
          </div>

          <div className="queue-cell-core">
            <span className="queue-cell-core-label">VALUE</span>
            <div className="queue-cell-value-panel">
              <PixelNumber
                value={value}
                active={
                  active ||
                  hovered ||
                  selected ||
                  traversed ||
                  found ||
                  scanning ||
                  focusLocked
                }
              />
            </div>
          </div>
        </div>
      </button>

      <div className="queue-cell-index">index {index}</div>
    </div>
  );
}

export default QueueCell;