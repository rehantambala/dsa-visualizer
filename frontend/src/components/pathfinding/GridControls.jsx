import DebuggerControls from '../debugger/DebuggerControls.jsx';

function GridControls({ algorithm, setAlgorithm, onRun, debuggerProps }) {
  return (
    <section className="control-panel stage-block stage-delay-2">
      <div className="panel-title">PATHFINDING CONTROLS</div>
      <div className="controls-grid">
        <div className="field">
          <label>ALGORITHM</label>
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
            <option value="dijkstra">Dijkstra</option>
            <option value="astar">A*</option>
            <option value="greedy">Greedy Best First Search</option>
            <option value="bfs">Breadth First Search</option>
          </select>
        </div>
        <button className="pixel-btn" type="button" onClick={onRun}>RUN</button>
      </div>
      <DebuggerControls {...debuggerProps} />
    </section>
  );
}

export default GridControls;
