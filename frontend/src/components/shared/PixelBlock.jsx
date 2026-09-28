/**
 * frontend/src/components/shared/PixelBlock.jsx
 *
 * What this file is for:
 * - Renders one interactive pixel block used by Array and Stack.
 * - Adds a livelier machine-card shell, status strip, aura, and animation states.
 *
 * What it connects to:
 * - Uses ./PixelNumber.jsx for the numeric dot-matrix display
 *
 * What it displays:
 * - one pixel block
 * - background pixel grid
 * - status chip
 * - glowing number chamber
 * - hover / active / insert / delete / update feedback
 */

import PixelNumber from "./PixelNumber.jsx";

function PixelBlock({
  value,
  active = false,
  hovered = false,
  animated = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
  actionType = "idle",
}) {
  const pixels = Array.from({ length: 64 });

  const statusText =
    actionType === "insert"
      ? "WRITE+"
      : actionType === "delete"
        ? "PURGE"
        : actionType === "update"
          ? "PATCH"
          : active
            ? "LOCK"
            : hovered
              ? "SCAN"
              : "READY";

  const readoutText = active ? "SELECTED" : hovered ? "FOCUS" : animated ? "RUNNING" : "IDLE";

  return (
    <button
      type="button"
      className={[
        "pixel-block",
        active ? "is-active" : "",
        hovered ? "is-hovered" : "",
        animated ? "is-animated" : "",
        actionType === "insert" ? "is-insert" : "",
        actionType === "delete" ? "is-delete" : "",
        actionType === "update" ? "is-update" : "",
      ]
        .join(" ")
        .trim()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="pixel-block-aura" />

      <div className="pixel-block-corners">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="pixel-block-topline">
        <div className="pixel-block-status">{statusText}</div>
        <div className="pixel-block-energy" />
      </div>

      <div className="pixel-grid">
        {pixels.map((_, index) => (
          <span key={index} className="pixel-cell" />
        ))}
      </div>

      <div className="pixel-value pixel-value-matrix">
        <PixelNumber value={value} active={active || hovered || animated} />
      </div>

      <div className="pixel-block-bottomline">
        <span className="pixel-block-readout">{readoutText}</span>
      </div>
    </button>
  );
}

export default PixelBlock;