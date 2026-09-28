/**
 * frontend/src/components/graph/GraphStage.jsx
 *
 * Renders the actual graph as SVG: nodes positioned on a circle, edges as lines
 * between them, colored by traversal state. Previously this rendered nodes as a
 * row of bars with no edges drawn at all - not a real graph layout.
 */
import { circularLayout } from '../../algorithms/graphStepEngine.js';

function nodeState(id, current, visited, frontier) {
  if (id === current) return 'current';
  if (visited.includes(id)) return 'visited';
  if (frontier.includes(id)) return 'frontier';
  return 'idle';
}

function GraphStage({ nodes, edges, current, visited = [], frontier = [], activeEdge }) {
  const positioned = circularLayout(nodes);
  const byId = new Map(positioned.map((n) => [n.id, n]));

  const isActiveEdge = (a, b) =>
    activeEdge && ((activeEdge[0] === a && activeEdge[1] === b) || (activeEdge[0] === b && activeEdge[1] === a));

  return (
    <section className="visual-panel stage-block stage-delay-3">
      <div className="visual-header">
        <div className="panel-title">GRAPH STAGE</div>
        <div className="visual-hint">Pink = current node · Filled = visited · Dashed = in queue/stack</div>
      </div>

      <div className="graph-stage-wrap">
        <svg viewBox="0 0 400 360" className="graph-svg" role="img" aria-label="Graph visualization">
          {edges.map(([a, b], idx) => {
            const from = byId.get(a);
            const to = byId.get(b);
            if (!from || !to) return null;
            const active = isActiveEdge(a, b);
            return (
              <g key={`edge-${a}-${b}-${idx}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  pathLength={100}
                  className={`graph-edge ${active ? 'is-active' : ''}`}
                />
                {active && (
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    pathLength={100}
                    className="graph-edge-flow"
                  />
                )}
              </g>
            );
          })}

          {positioned.map((node) => {
            const state = nodeState(node.id, current, visited, frontier);
            return (
              <g
                key={node.id}
                className="graph-node-pos"
                style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
              >
                <g className={`graph-node graph-node-${state}`}>
                  {state === 'current' && <circle className="graph-node-ring" cx={0} cy={0} r={22} />}
                  <circle cx={0} cy={0} r={22} />
                  <text x={0} y={5} textAnchor="middle">
                    {node.id}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="graph-legend">
        <span className="graph-legend-item graph-node-visited"><i /> visited</span>
        <span className="graph-legend-item graph-node-frontier"><i /> queued</span>
        <span className="graph-legend-item graph-node-current"><i /> current</span>
        <span className="graph-legend-item graph-node-idle"><i /> unvisited</span>
      </div>
    </section>
  );
}

export default GraphStage;
