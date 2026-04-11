import PixelNumber from '../shared/PixelNumber.jsx';

function GraphStage({ nodes, edges, activeNodes }) {
  return (
    <section className="visual-panel stage-block stage-delay-3">
      <div className="panel-title">GRAPH STAGE</div>
      <div className="sorting-stage-wrap algo-stage-grid">
        {nodes.map((n) => (
          <div key={n.id} className={`sorting-card-shell ${activeNodes.includes(n.id) ? 'is-swapped' : ''}`}>
            <PixelNumber value={n.id} active={activeNodes.includes(n.id)} />
            <div className="sorting-card-energy" />
          </div>
        ))}
      </div>
      <div className="sorting-note">Edges: {edges.map((e) => `${e[0]}-${e[1]}`).join(', ')}</div>
    </section>
  );
}

export default GraphStage;
