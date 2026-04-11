import PixelNumber from '../shared/PixelNumber.jsx';

function GraphStage({ nodes, edges, activeNodes }) {
  return (
    <section className="visual-panel stage-block stage-delay-3">
      <div className="panel-title">GRAPH STAGE</div>
      <div className="sorting-stage-wrap" style={{ minHeight: 220 }}>
        {nodes.map((n) => (
          <div key={n.id} className={`sorting-bar-shell ${activeNodes.includes(n.id) ? 'is-swapped' : ''}`}>
            <div className="sorting-bar" style={{ height: '70%' }} />
            <div className="sorting-bar-value"><PixelNumber value={n.id} active={activeNodes.includes(n.id)} /></div>
          </div>
        ))}
      </div>
      <div className="sorting-note">Edges: {edges.map((e) => `${e[0]}-${e[1]}`).join(', ')}</div>
    </section>
  );
}

export default GraphStage;
