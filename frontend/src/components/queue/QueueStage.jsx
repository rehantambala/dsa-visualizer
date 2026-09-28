/**
 * frontend/src/components/queue/QueueStage.jsx
 *
 * What this file is for:
 * - Pure visual render layer for the queue.
 * - Places queue cells inside a machine-like chamber with a FRONT dock and REAR dock.
 * - Keeps the central chamber stable and scrollable while enqueue and dequeue animate smoothly.
 *
 * What it connects to:
 * - Uses ./QueueCell.jsx to render each queue item
 * - Uses ../shared/PixelNumber.jsx for dock ghost values and bridge travel tokens
 *
 * What it displays:
 * - front exit dock
 * - rear entry dock
 * - central queue chamber
 * - directional flow lane
 * - ghost incoming / outgoing values
 * - bridge travel token
 * - queue cells
 * - empty state when the queue has no items
 */

import { Fragment, useEffect, useRef } from "react";
import QueueCell from "./QueueCell.jsx";
import PixelNumber from "../shared/PixelNumber.jsx";

function QueueStage({
  items,
  activeIndex,
  hoverIndex,
  selectedIndex,
  scannerIndex,
  focusLockIndex,
  traversedIndices,
  foundIndex,
  pendingAction,
  pendingIndex,
  incomingGhostValue,
  outgoingGhostValue,
  entryPulseActive,
  exitPulseActive,
  bridgeToken,
  rowMotion,
  onHoverIndex,
  onSelectIndex,
}) {
  const viewportRef = useRef(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || items.length === 0) return;

    const targetIndex =
      pendingIndex !== null && pendingIndex !== undefined
        ? Math.min(pendingIndex, items.length - 1)
        : foundIndex !== null && foundIndex !== undefined
          ? foundIndex
          : activeIndex !== null && activeIndex !== undefined
            ? activeIndex
            : selectedIndex !== null && selectedIndex !== undefined
              ? selectedIndex
              : null;

    if (targetIndex === null) return;

    const targetElement = viewport.querySelector(`[data-queue-cell-index="${targetIndex}"]`);
    if (!targetElement) return;

    targetElement.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [items.length, activeIndex, selectedIndex, pendingIndex, foundIndex]);

  return (
    <div className="queue-stage">
      <div className="queue-stage-shell">
        <div className="queue-stage-grid" />
        <div className="queue-stage-scanline" />

        <div className={`queue-terminal queue-terminal-front ${exitPulseActive ? "is-active" : ""}`}>
          <div className="queue-terminal-head">
            <span className="queue-terminal-title">FRONT</span>
            <span className="queue-terminal-subtitle">EXIT / PEEK</span>
          </div>

          <div className="queue-terminal-window">
            {outgoingGhostValue !== null ? (
              <div className="queue-terminal-ghost queue-terminal-ghost-out">
                <PixelNumber value={outgoingGhostValue} active />
              </div>
            ) : (
              <div className="queue-terminal-idle-text">SERVE</div>
            )}
          </div>
        </div>

        <div className={`queue-terminal queue-terminal-rear ${entryPulseActive ? "is-active" : ""}`}>
          <div className="queue-terminal-head">
            <span className="queue-terminal-title">REAR</span>
            <span className="queue-terminal-subtitle">ENTRY</span>
          </div>

          <div className="queue-terminal-window">
            {incomingGhostValue !== null ? (
              <div className="queue-terminal-ghost queue-terminal-ghost-in">
                <PixelNumber value={incomingGhostValue} active />
              </div>
            ) : (
              <div className="queue-terminal-idle-text">LOAD</div>
            )}
          </div>
        </div>

        <div className={`queue-lane-bridge queue-lane-bridge-front ${exitPulseActive ? "is-active" : ""}`} />
        <div className={`queue-lane-bridge queue-lane-bridge-rear ${entryPulseActive ? "is-active" : ""}`} />

        {bridgeToken ? (
          <div
            key={bridgeToken.key}
            className={`queue-bridge-token queue-bridge-token-${bridgeToken.type}`}
          >
            <div className="queue-bridge-token-inner">
              <PixelNumber value={bridgeToken.value} active />
            </div>
          </div>
        ) : null}

        <div className="queue-machine-grid">
          <div className="queue-machine-left-spacer" />

          <div className="queue-machine-center">
            <div className="queue-direction-band">
              {Array.from({ length: 16 }).map((_, index) => (
                <span key={index} className="queue-direction-arrow" />
              ))}
            </div>

            <div className="queue-machine-lane">
              <div className="queue-lane-rail queue-lane-rail-top" />
              <div className="queue-lane-rail queue-lane-rail-bottom" />
              <div className="queue-lane-track-fill" />

              <div className="queue-center-viewport" ref={viewportRef}>
                {items.length === 0 ? (
                  <div className="queue-empty-state">
                    <div className="queue-empty-box">
                      <div className="queue-empty-title">FRONT | EMPTY QUEUE | REAR</div>
                      <div className="queue-empty-subtitle">
                        Enqueue a value and it will enter from the right-side rear dock into the queue chamber.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={[
                      "queue-row",
                      rowMotion === "dequeue" ? "is-shifting-front" : "",
                      rowMotion === "enqueue" ? "is-settling-rear" : "",
                    ]
                      .join(" ")
                      .trim()}
                  >
                    {items.map((item, index) => {
                      const isFront = index === 0;
                      const isRear = index === items.length - 1;

                      const transferActive =
                        traversedIndices.includes(index) ||
                        traversedIndices.includes(index + 1) ||
                        scannerIndex === index ||
                        scannerIndex === index + 1 ||
                        (pendingAction === "enqueue" && index === items.length - 2) ||
                        (pendingAction === "dequeue" && index === 0);

                      const isLeavingFront =
                        pendingAction === "dequeue" &&
                        pendingIndex === index &&
                        index === 0;

                      return (
                        <Fragment key={item.id}>
                          <div
                            className={`queue-slot ${isLeavingFront ? "is-front-leaving" : ""}`}
                            data-queue-cell-index={index}
                          >
                            <QueueCell
                              index={index}
                              value={item.value}
                              isFront={isFront}
                              isRear={isRear}
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

                          {index < items.length - 1 ? (
                            <div className={`queue-transfer-gap ${transferActive ? "is-active" : ""}`}>
                              <span />
                              <span />
                              <span />
                            </div>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="queue-machine-right-spacer" />
        </div>
      </div>
    </div>
  );
}

export default QueueStage;