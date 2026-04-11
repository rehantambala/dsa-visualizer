import DebuggerControls from '../debugger/DebuggerControls.jsx';

function GraphControls({ algorithm, setAlgorithm, onRun, debuggerProps }) {
  return (
    <section className="control-panel stage-block stage-delay-2">
      <div className="panel-title">GRAPH CONTROLS</div>
      <div className="controls-grid">
        <div className="field">
          <label>ALGORITHM</label>
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
            <option value="bfs">Breadth First Search</option>
            <option value="dfs">Depth First Search</option>
            <option value="dijkstra">Dijkstra Shortest Path</option>
            <option value="astar">A* Pathfinding</option>
          </select>
        </div>
        <button className="pixel-btn" type="button" onClick={onRun}>RUN</button>
      </div>
      <DebuggerControls {...debuggerProps} />
    </section>
  );
}

export default GraphControls;
