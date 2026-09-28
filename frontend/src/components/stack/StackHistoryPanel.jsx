/**
 * frontend/src/components/stack/StackHistoryPanel.jsx
 *
 * What this file is for:
 * - Displays clickable stack history snapshots and restore actions.
 * - Adds a small note so restore behavior feels clearer.
 *
 * What it connects to:
 * - Receives history data and restore handler from ./StackVisualizer.jsx
 *
 * What it displays:
 * - stack operation timeline
 * - snapshot text
 * - clickable restore buttons
 */

function StackHistoryPanel({ history, selectedHistoryId, onRestoreHistory }) {
  return (
    <section className="info-card stack-history-panel">
      <div className="panel-title">STACK HISTORY (CLICK TO RESTORE)</div>

      <div className="stack-history-note">
        Jump back to any previous snapshot and replay the LIFO behavior from that exact state.
      </div>

      <div className="history-list">
        {history.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`history-item ${selectedHistoryId === item.id ? "is-selected" : ""}`}
            onClick={() => onRestoreHistory(item)}
          >
            <span className="history-label">{item.label}</span>
            <span className="history-snapshot">[{item.snapshot.join(", ")}]</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default StackHistoryPanel;