import DebuggerControls from '../debugger/DebuggerControls.jsx';
import PixelSelect from '../shared/PixelSelect.jsx';

function GridControls({ algorithm, setAlgorithm, editMode, setEditMode, onRun, onClearWalls, onRandomWalls, debuggerProps }) {
  return (
    <section className="control-panel stage-block stage-delay-2">
      <div className="panel-title">PATHFINDING CONTROLS</div>
      <div className="controls-row">
        <div className="field">
          <label>ALGORITHM</label>
          <PixelSelect
            ariaLabel="Pathfinding algorithm"
            value={algorithm}
            onChange={setAlgorithm}
            options={[
              { value: 'dijkstra', label: 'Dijkstra' },
              { value: 'astar', label: 'A*' },
              { value: 'greedy', label: 'Greedy Best First Search' },
              { value: 'bfs', label: 'Breadth First Search' },
            ]}
          />
        </div>
        <div className="field">
          <label>CLICK MODE</label>
          <PixelSelect
            ariaLabel="Grid edit mode"
            value={editMode}
            onChange={setEditMode}
            options={[
              { value: 'wall', label: 'Toggle Wall' },
              { value: 'start', label: 'Move Start' },
              { value: 'end', label: 'Move End' },
            ]}
          />
        </div>
        <button className="pixel-btn" type="button" onClick={onRun}>RUN</button>
        <button className="pixel-btn ghost" type="button" onClick={onRandomWalls}>RANDOM WALLS</button>
        <button className="pixel-btn ghost" type="button" onClick={onClearWalls}>CLEAR WALLS</button>
      </div>
      <DebuggerControls {...debuggerProps} />
    </section>
  );
}

export default GridControls;
