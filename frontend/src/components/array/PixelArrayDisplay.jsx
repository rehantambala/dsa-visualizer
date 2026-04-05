/**
 * frontend/src/components/array/PixelArrayDisplay.jsx
 *
 * What this file is for:
 * - Upgrades the array stage into a more alive visual lane.
 * - Adds auto-scroll to the active / animated block.
 * - Adds state chips and a more premium empty state.
 *
 * What it connects to:
 * - Receives array state and handlers from ../../App.jsx
 * - Uses ../shared/PixelBlock.jsx to render each element
 *
 * What it displays:
 * - a full array stage shell
 * - interactive array blocks
 * - index labels
 * - state chips for active / hover / action
 * - empty array placeholder
 */

import { useEffect, useRef } from "react";
import PixelBlock from "../shared/PixelBlock.jsx";

function PixelArrayDisplay({
  array,
  activeIndex,
  hoverIndex,
  animatedIndex,
  onHoverIndex,
  onSelectIndex,
  lastAction,
}) {
  const stageRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || array.length === 0) return;

    const targetIndex =
      animatedIndex !== null && animatedIndex !== undefined
        ? animatedIndex
        : activeIndex !== null && activeIndex !== undefined
          ? activeIndex
          : hoverIndex !== null && hoverIndex !== undefined
            ? hoverIndex
            : null;

    if (targetIndex === null) return;

    const targetNode = stage.querySelector(`[data-array-index="${targetIndex}"]`);
    if (!targetNode) return;

    targetNode.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [array.length, activeIndex, hoverIndex, animatedIndex]);

  if (array.length === 0) {
    return (
      <div className="array-empty">
        <div className="array-empty-box">
          <div className="array-empty-title">NO PIXELS LOADED</div>
          <div className="array-empty-subtitle">
            Create, randomize, or restore a history snapshot to fill the array lane.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="array-stage" ref={stageRef}>
      <div className="array-stage-shell">
        <div className="array-stage-grid" />
        <div className="array-stage-scanline" />

        <div className="array-stage-rail array-stage-rail-left">START</div>
        <div className="array-stage-rail array-stage-rail-right">END</div>

        <div className="array-row">
          {array.map((value, index) => {
            const isActive = activeIndex === index;
            const isHovered = hoverIndex === index;
            const isAnimated = animatedIndex === index;

            const chipText = isAnimated
              ? lastAction.toUpperCase()
              : isActive
                ? "LOCK"
                : isHovered
                  ? "SCAN"
                  : "IDLE";

            return (
              <div
                className={[
                  "array-item",
                  isActive ? "is-active" : "",
                  isHovered ? "is-hovered" : "",
                  isAnimated ? "is-animated" : "",
                ]
                  .join(" ")
                  .trim()}
                key={`${value}-${index}-${array.length}`}
                data-array-index={index}
              >
                <div className="array-item-meta">
                  <span className="array-chip">{chipText}</span>
                  <span className="array-index">INDEX {index}</span>
                </div>

                <PixelBlock
                  value={value}
                  active={isActive}
                  hovered={isHovered}
                  animated={isAnimated}
                  onMouseEnter={() => onHoverIndex(index)}
                  onMouseLeave={() => onHoverIndex(null)}
                  onClick={() => onSelectIndex(index)}
                  actionType={isAnimated ? lastAction : "idle"}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PixelArrayDisplay;