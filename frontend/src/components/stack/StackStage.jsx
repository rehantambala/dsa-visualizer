/**
 * frontend/src/components/stack/StackStage.jsx
 *
 * What this file is for:
 * - Pure visual renderer for the vertical stack chamber.
 * - Upgrades the chamber into a cleaner, more alive machine view.
 * - Correctly wires PixelBlock props so stack animations and active states actually work.
 *
 * What it connects to:
 * - Uses ../shared/PixelBlock.jsx
 * - Receives stack items and visual state from ./StackVisualizer.jsx
 *
 * What it displays:
 * - vertical stack blocks
 * - top marker
 * - animated push / pop / peek states
 * - stack metadata
 * - empty state
 *
 * Important behavior:
 * - The actual top of the stack is the last value in data,
 *   but it is displayed visually at the top of the column.
 */

import PixelBlock from "../shared/PixelBlock.jsx";

function StackStage({ stack, peekFlashId, topValue, message, lastAction }) {
  const stackSize = stack.length;
  const displayStack = [...stack].reverse();

  return (
    <div className="stack-stage-wrap">
      <div className="stack-meta-column">
        <div className="stack-top-badge">TOP ACCESS</div>

        <div className="stack-meta-box">
          <div className="stack-meta-label">SIZE</div>
          <div className="stack-meta-value">{stackSize}</div>
        </div>

        <div className="stack-meta-box">
          <div className="stack-meta-label">TOP VALUE</div>
          <div className="stack-meta-value">{topValue === null ? "--" : topValue}</div>
        </div>

        <div className="stack-meta-box">
          <div className="stack-meta-label">LAST OP</div>
          <div className="stack-meta-value">{lastAction.toUpperCase()}</div>
        </div>
      </div>

      <div className={`stack-chamber stack-chamber-${lastAction}`}>
        <div className="stack-chamber-grid" />
        <div className="stack-chamber-scanline" />
        <div className="stack-chamber-frame-top">PUSH PORT</div>

        <div className="stack-chamber-inner stack-chamber-inner-top">
          {stack.length === 0 ? (
            <div className="stack-empty-state">
              <div className="stack-empty-title">STACK EMPTY</div>
              <div className="stack-empty-subtitle">
                Push a value to create a new top element.
              </div>
            </div>
          ) : (
            displayStack.map((item, index) => {
              const isTop = index === 0;
              const isPeeking = peekFlashId === item.id;
              const animationType =
                item.phase === "enter" ? "insert" : item.phase === "exit" ? "delete" : "idle";

              return (
                <div
                  key={item.id}
                  className={[
                    "stack-node-row",
                    isTop ? "is-top-row" : "",
                    isPeeking ? "is-peeking-row" : "",
                    item.phase === "enter" ? "is-entering-row" : "",
                    item.phase === "exit" ? "is-exiting-row" : "",
                  ]
                    .join(" ")
                    .trim()}
                >
                  <div className="stack-node-rail" />
                  <div className="stack-node-label">
                    {isTop ? "TOP" : `LEVEL ${stack.length - index}`}
                  </div>

                  <PixelBlock
                    value={item.value}
                    active={isTop || isPeeking}
                    hovered={false}
                    animated={item.phase !== "idle" || isPeeking}
                    actionType={animationType}
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="stack-floor-line" />
      </div>

      <div className="stack-message-box">
        <span className="stack-message-label">LIVE FEED</span>
        <span className="stack-message-text">{message}</span>
      </div>
    </div>
  );
}

export default StackStage;