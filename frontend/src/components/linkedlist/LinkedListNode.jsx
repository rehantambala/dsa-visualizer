/**
 * frontend/src/components/linked/LinkedListNode.jsx
 *
 * What this file is for:
 * - Renders one clickable linked list node in the premium pixel style.
 * - Handles visual states like selected, active, traversed, found, scan, target lock, insert, delete, and update.
 *
 * What it connects to:
 * - Uses ../shared/PixelNumber.jsx to display the node value in pixel digits
 *
 * What it displays:
 * - one linked list node
 * - node value chamber
 * - pointer chamber
 * - node status chip
 * - index label
 */

import PixelNumber from "../shared/PixelNumber.jsx";

function LinkedListNode({
  index,
  value,
  isHead = false,
  isTail = false,
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
  const pixels = Array.from({ length: 50 });

  const statusChip = found
    ? "FOUND"
    : focusLocked
      ? "LOCK"
      : active || scanning
        ? "SCAN"
        : selected
          ? "TARGET"
          : isHead
            ? "HEAD"
            : isTail
              ? "TAIL"
              : `NODE ${index}`;

  const className = [
    "linked-node",
    active ? "is-active" : "",
    hovered ? "is-hovered" : "",
    selected ? "is-selected" : "",
    traversed ? "is-traversed" : "",
    found ? "is-found" : "",
    scanning ? "is-scanning" : "",
    focusLocked ? "is-focus-locked" : "",
    actionType === "insert" ? "is-pending-insert" : "",
    actionType === "append" ? "is-pending-insert" : "",
    actionType === "prepend" ? "is-pending-insert" : "",
    actionType === "delete" ? "is-pending-delete" : "",
    actionType === "update" ? "is-pending-update" : "",
  ]
    .join(" ")
    .trim();

  return (
    <div className="linked-node-wrap">
      <button
        type="button"
        className={className}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        aria-label={`Linked list node ${index} with value ${value}`}
      >
        <div className="linked-node-aura" />

        <div className="linked-node-pixel-grid">
          {pixels.map((_, pixelIndex) => (
            <span key={pixelIndex} className="linked-node-pixel" />
          ))}
        </div>

        <div className="linked-node-content">
          <div className="linked-node-topline">
            <div className="linked-node-chip">{statusChip}</div>
            <div className="linked-node-mini-index">#{index}</div>
          </div>

          <div className="linked-node-panels">
            <div className="linked-node-value-panel">
              <span className="linked-node-panel-label">VALUE</span>
              <div className="linked-node-panel-core">
                <PixelNumber
                  value={value}
                  active={active || hovered || selected || traversed || found || scanning || focusLocked}
                />
              </div>
            </div>

            <div className="linked-node-next-panel">
              <span className="linked-node-panel-label">PTR</span>
              <div className="linked-node-next-core">{isTail ? "NULL" : "NEXT"}</div>
            </div>
          </div>
        </div>
      </button>

      <div className="linked-node-index">index {index}</div>
    </div>
  );
}

export default LinkedListNode;