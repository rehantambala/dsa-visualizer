function GridStage({ visited }) {
  const cells = Array.from({ length: 100 }, (_, i) => i);
  return (
    <section className="visual-panel stage-block stage-delay-3">
      <div className="panel-title">GRID STAGE</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
        {cells.map((c) => (
          <div
            key={c}
            style={{
              height: 20,
              border: '1px solid rgba(255, 255, 255, 0.16)',
              background: visited.includes(c) ? 'rgba(255, 44, 143, 0.22)' : 'rgba(255, 255, 255, 0.03)',
              boxShadow: visited.includes(c) ? '0 0 10px rgba(255, 44, 143, 0.22)' : 'none',
            }}
          />
        ))}
      </div>
    </section>
  );
}

export default GridStage;
