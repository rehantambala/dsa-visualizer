/**
 * frontend/src/components/graph/GraphControls.jsx
 *
 * Redesigned into three clearly labeled steps so someone learning graphs (not just
 * someone who already knows the workflow) can follow along: build the graph, choose
 * how to search it, then step through what the algorithm is actually doing.
 *
 * Also fixed a real layout bug: the shared `.controls-grid` uses `minmax(110px, 1fr)`
 * columns, but button text doesn't wrap, so a long label like "REMOVE LAST NODE"
 * forced that column past its minimum and pushed the whole panel wider than the
 * viewport (buttons got clipped off-screen). `.graph-controls-row` below is a wrapping
 * flex row instead of a fixed grid, so it can never overflow regardless of label length
 * or window size.
 */
import DebuggerControls from '../debugger/DebuggerControls.jsx';
import PixelSelect from '../shared/PixelSelect.jsx';

function GraphControls({
  algorithm,
  setAlgorithm,
  startId,
  setStartId,
  nodes,
  onRun,
  onAddNode,
  onRemoveNode,
  onAddEdge,
  onRandomize,
  edgeFrom,
  setEdgeFrom,
  edgeTo,
  setEdgeTo,
  debuggerProps,
}) {
  return (
    <>
      {/* Step 1 — build the graph */}
      <section className="control-panel stage-block stage-delay-2">
        <div className="panel-title">1. BUILD YOUR GRAPH</div>
        <p className="graph-controls-hint">
          Add nodes, connect two of them with an edge, or generate a random graph to
          explore. The graph you build here is the real thing the algorithm runs on
          below — nothing is faked.
        </p>

        <div className="graph-controls-row">
          <button className="pixel-btn" type="button" onClick={onAddNode}>
            + ADD NODE
          </button>
          <button className="pixel-btn ghost" type="button" onClick={onRemoveNode} disabled={nodes.length <= 1}>
            − REMOVE LAST NODE
          </button>
          <button className="pixel-btn ghost" type="button" onClick={onRandomize}>
            ⟳ RANDOMIZE GRAPH
          </button>
        </div>

        <div className="graph-controls-row" style={{ marginTop: 14 }}>
          <div className="field graph-field">
            <label>CONNECT FROM</label>
            <PixelSelect
              ariaLabel="Connect from node"
              value={edgeFrom}
              onChange={(v) => setEdgeFrom(Number(v))}
              options={nodes.map((n) => ({ value: n.id, label: `Node ${n.id}` }))}
            />
          </div>

          <div className="field graph-field">
            <label>TO</label>
            <PixelSelect
              ariaLabel="Connect to node"
              value={edgeTo}
              onChange={(v) => setEdgeTo(Number(v))}
              options={nodes.map((n) => ({ value: n.id, label: `Node ${n.id}` }))}
            />
          </div>

          <button className="pixel-btn" type="button" onClick={onAddEdge} disabled={edgeFrom === edgeTo}>
            ADD EDGE
          </button>
        </div>
      </section>

      {/* Step 2 — pick the algorithm and where it starts */}
      <section className="control-panel stage-block stage-delay-2">
        <div className="panel-title">2. CHOOSE HOW TO SEARCH IT</div>
        <p className="graph-controls-hint">
          BFS explores neighbor-by-neighbor using a queue; DFS dives down one path at a
          time using a stack. Pick one, pick where it starts, then run it.
        </p>

        <div className="graph-controls-row">
          <div className="field graph-field">
            <label>ALGORITHM</label>
            <PixelSelect
              ariaLabel="Traversal algorithm"
              value={algorithm}
              onChange={setAlgorithm}
              options={[
                { value: 'bfs', label: 'Breadth First Search (BFS)' },
                { value: 'dfs', label: 'Depth First Search (DFS)' },
              ]}
            />
          </div>

          <div className="field graph-field">
            <label>START NODE</label>
            <PixelSelect
              ariaLabel="Start node"
              value={startId}
              onChange={(v) => setStartId(Number(v))}
              options={nodes.map((n) => ({ value: n.id, label: `Node ${n.id}` }))}
            />
          </div>

          <button className="pixel-btn" type="button" onClick={onRun}>
            ▶ RUN
          </button>
        </div>
      </section>

      {/* Step 3 — step through what actually happened */}
      <section className="control-panel stage-block stage-delay-2">
        <div className="panel-title">3. STEP THROUGH IT</div>
        <p className="graph-controls-hint">
          Move one decision at a time to see exactly which node gets visited next and
          why, or let it auto-play. Watch the queue/stack size in LIVE STATS below
          change as you step.
        </p>
        <DebuggerControls {...debuggerProps} />
      </section>
    </>
  );
}

export default GraphControls;
