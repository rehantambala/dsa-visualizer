function GridStage({ visited }) {
  const cells = Array.from({ length: 100 }, (_, i) => i);
  return (
    <section className="visual-panel stage-block stage-delay-3">
      <div className="panel-title">GRID STAGE</div>
      <div className="sorting-stage-wrap">
        <div className="algo-grid-cells">
          {cells.map((c) => (
            <div key={c} className={`algo-grid-cell ${visited.includes(c) ? 'is-active' : ''}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default GridStage;
