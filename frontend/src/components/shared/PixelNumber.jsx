/**
 * frontend/src/components/shared/PixelNumber.jsx
 *
 * What this file is for:
 * - Splits a number into characters and renders each character through PixelDigit.jsx.
 * - Adds an active class so the full number can glow together.
 *
 * What it connects to:
 * - Used by ./PixelBlock.jsx
 * - Used by Stack, Queue, and Linked List renderers
 *
 * What it displays:
 * - one or more dot-matrix digits side by side
 */

import PixelDigit from "./PixelDigit.jsx";

function PixelNumber({ value, active = false }) {
  const chars = String(value).split("");

  return (
    <div className={`pixel-number ${active ? "is-active" : ""}`}>
      {chars.map((char, index) => (
        <PixelDigit
          key={`${char}-${index}`}
          char={char}
          active={active}
          compact={chars.length >= 2}
        />
      ))}
    </div>
  );
}

export default PixelNumber;