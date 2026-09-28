/**
 * frontend/src/components/tree/BinaryTreeStage.jsx
 *
 * Renders the actual BST as SVG: nodes positioned by inorder rank (x) and depth
 * (y), with real parent-child edges drawn between them. Previously this rendered
 * the "tree" as a flat grid of PixelBlocks with no edges and no structure at all.
 */
import { treeLayout } from '../../algorithms/treeStepEngine.js';

function BinaryTreeStage({ tree, activeId, visitedIds = [] }) {
  const { nodes, edges, height } = treeLayout(tree, 640, 90);

  return (
    <section className="visual-panel stage-block stage-delay-3">
      <div className="visual-header">
        <div className="panel-title">BINARY TREE STAGE</div>
        <div className="visual-hint">Pink = current node · Gold ring = visited (traversal) · Lines = real left/right edges</div>
      </div>

      {nodes.length === 0 ? (
        <div className="sorting-note">Tree is empty. Insert a value to grow the root.</div>
      ) : (
        <div className="graph-stage-wrap">
          <svg viewBox={`0 0 640 ${height}`} className="graph-svg tree-svg" role="img" aria-label="Binary tree visualization">
            {edges.map((edge, idx) => (
              <line
                key={`edge-${idx}`}
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
                pathLength={100}
                className="graph-edge"
              />
            ))}

            {nodes.map((node) => {
              const isActive = node.id === activeId;
              const isVisited = visitedIds.includes(node.id);
              const state = isActive ? 'current' : isVisited ? 'visited' : 'idle';
              return (
                <g
                  key={node.id}
                  className="graph-node-pos"
                  style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                >
                  <g className={`graph-node graph-node-${state}`}>
                    {isActive && <circle className="graph-node-ring" cx={0} cy={0} r={22} />}
                    <circle cx={0} cy={0} r={22} />
                    <text x={0} y={5} textAnchor="middle">
                      {node.value}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <div className="graph-legend">
        <span className="graph-legend-item graph-node-visited"><i /> visited</span>
        <span className="graph-legend-item graph-node-current"><i /> current</span>
      </div>
    </section>
  );
}

export default BinaryTreeStage;
