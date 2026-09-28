function HistoryPanel({ title = 'HISTORY', items = [], selectedId, onSelect }) {
  return (
    <section className="info-card">
      <div className="panel-title">{title}</div>
      <div className="history-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`history-item ${selectedId === item.id ? 'is-selected' : ''}`}
            onClick={() => onSelect(item)}
          >
            <span className="history-label">{item.label}</span>
            <span className="history-snapshot">{item.snapshot}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default HistoryPanel;
