/**
 * frontend/src/components/linked/LinkedListStage.jsx
 *
 * What this file is for:
 * - Pure visual render layer for the linked list chain.
 * - Places nodes, arrows, HEAD / TAIL markers, and NULL ending.
 * - Adds stronger interaction feedback with rail glow, active link energy, and scan flow.
 * - Auto-scrolls the horizontal stage so newly added or selected nodes stay visible.
 *
 * What it connects to:
 * - Uses ./LinkedListNode.jsx to render each node
 *
 * What it displays:
 * - full linked list chain
 * - glowing arrows between nodes
 * - HEAD marker
 * - TAIL marker
 * - empty state when the list has no nodes
 */

import { useEffect, useRef } from "react";
import LinkedListNode from "./LinkedListNode.jsx";

function LinkedListStage({
  nodes,
  activeIndex,
  hoverIndex,
  selectedIndex,
  scannerIndex,
  focusLockIndex,
  traversedIndices,
  foundIndex,
  pendingAction,
  pendingIndex,
  linkPulseIndex,
  onHoverIndex,
  onSelectIndex,
}) {
  const stageViewportRef = useRef(null);

  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!viewport || nodes.length === 0) return;

    const targetIndex =
      pendingIndex !== null && pendingIndex !== undefined
        ? Math.min(pendingIndex, nodes.length - 1)
        : foundIndex !== null && foundIndex !== undefined
          ? foundIndex
          : activeIndex !== null && activeIndex !== undefined
            ? activeIndex
            : selectedIndex !== null && selectedIndex !== undefined
              ? selectedIndex
              : null;

    if (targetIndex === null) return;

    const targetElement = viewport.querySelector(`[data-linked-node-index="${targetIndex}"]`);
    if (!targetElement) return;

    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    const nextScrollLeft =
      viewport.scrollLeft +
      (targetRect.left - viewportRect.left) -
      (viewportRect.width / 2 - targetRect.width / 2);

    viewport.scrollTo({
      left: Math.max(0, nextScrollLeft),
      behavior: "smooth",
    });
  }, [nodes.length, activeIndex, selectedIndex, pendingIndex, foundIndex]);

  if (nodes.length === 0) {
    return (
      <div className="linked-stage" ref={stageViewportRef}>
        <div className="linked-stage-shell">
          <div className="linked-empty-state">
            <div className="linked-empty-box">
              <div className="linked-empty-title">HEAD → NULL</div>
              <div className="linked-empty-subtitle">
                The list is empty. Append or prepend a value to create the first node.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="linked-stage" ref={stageViewportRef}>
      <div className="linked-stage-shell">
        <div className="linked-stage-grid" />
        <div className="linked-stage-scanline" />
        <div className="linked-chain-row">
          {nodes.map((node, index) => {
            const isTail = index === nodes.length - 1;
            const showArrow = index < nodes.length - 1;

            const arrowAwake =
              hoverIndex === index ||
              hoverIndex === index + 1 ||
              selectedIndex === index ||
              selectedIndex === index + 1;

            const arrowFlow =
              scannerIndex === index ||
              scannerIndex === index + 1 ||
              (traversedIndices.includes(index) && traversedIndices.includes(index + 1));

            const arrowClassName = [
              "linked-arrow",
              arrowAwake ? "is-awake" : "",
              arrowFlow ? "is-data-flow" : "",
              linkPulseIndex === index ? "is-link-pulsed" : "",
              pendingAction === "insert" && pendingIndex === index + 1 ? "is-connecting" : "",
              pendingAction === "append" && pendingIndex === index + 1 ? "is-connecting" : "",
              pendingAction === "prepend" && index === 0 ? "is-connecting" : "",
              pendingAction === "delete" && pendingIndex === index + 1 ? "is-disconnecting" : "",
            ]
              .join(" ")
              .trim();

            return (
              <div
                key={node.id}
                className="linked-chain-segment"
                data-linked-node-index={index}
              >
                <div className="linked-node-column">
                  <div className="linked-marker-stack">
                    {index === 0 ? <span className="linked-marker head">HEAD</span> : null}
                    {isTail ? <span className="linked-marker tail">TAIL</span> : null}
                  </div>

                  <LinkedListNode
                    index={index}
                    value={node.value}
                    isHead={index === 0}
                    isTail={isTail}
                    active={activeIndex === index}
                    hovered={hoverIndex === index}
                    selected={selectedIndex === index}
                    traversed={traversedIndices.includes(index)}
                    found={foundIndex === index}
                    scanning={scannerIndex === index}
                    focusLocked={focusLockIndex === index}
                    actionType={pendingIndex === index ? pendingAction : "idle"}
                    onMouseEnter={() => onHoverIndex(index)}
                    onMouseLeave={() => onHoverIndex(null)}
                    onClick={() => onSelectIndex(index)}
                  />
                </div>

                {showArrow ? (
                  <div className={arrowClassName}>
                    <span className="linked-arrow-label">next</span>
                    <div className="linked-arrow-track">
                      <div className="linked-arrow-line" />
                      <div className="linked-arrow-particles">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="linked-arrow-head" />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`linked-null-pill ${
                      activeIndex === index || selectedIndex === index ? "is-awake" : ""
                    }`}
                  >
                    NULL
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default LinkedListStage;