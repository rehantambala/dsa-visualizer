/**
 * frontend/src/components/pathfinding/PathfindingVisualizer.jsx
 *
 * REBUILT: onRun() used to return the identical hardcoded 19-cell path regardless
 * of which algorithm was selected - Dijkstra, A*, Greedy, and BFS all produced the
 * exact same fake result, and there was no way to place walls or move start/end.
 * Now RUN drives a real search (pathfindingStepEngine.js) over an editable grid.
 */
import { useState } from 'react';
import GridControls from './GridControls.jsx';
import GridStage from './GridStage.jsx';
import PathfindingLearningPanel from './PathfindingLearningPanel.jsx';
import HistoryPanel from '../shared/HistoryPanel.jsx';
import { useAlgorithmDebugger } from '../debugger/useAlgorithmDebugger.js';
import { ALGORITHMS } from '../../algorithms/pathfindingStepEngine.js';
import { logRun } from '../../utils/logRun.js';
import './pathfinding.css';

const ROWS = 10;
const COLS = 10;
const ALGO_LABELS = { bfs: 'Breadth First Search', dijkstra: 'Dijkstra', astar: 'A*', greedy: 'Greedy Best First Search' };

function PathfindingVisualizer() {
  const [algorithm, setAlgorithm] = useState('dijkstra');
  const [editMode, setEditMode] = useState('wall');
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(ROWS * COLS - 1);
  const [walls, setWalls] = useState(() => new Set());
  const [steps, setSteps] = useState([{ visited: [], frontier: [], current: null, path: [], message: 'Grid ready. Click cells to add walls, then hit RUN.' }]);
  const [history, setHistory] = useState([]);
  const debuggerState = useAlgorithmDebugger(steps, 90);
  const current = debuggerState.currentStep || steps[0];

  const onCellClick = (cell) => {
    if (editMode === 'start') {
      if (cell === end || walls.has(cell)) return;
      setStart(cell);
      return;
    }
    if (editMode === 'end') {
      if (cell === start || walls.has(cell)) return;
      setEnd(cell);
      return;
    }
    if (cell === start || cell === end) return;
    setWalls((prev) => {
      const next = new Set(prev);
      if (next.has(cell)) next.delete(cell);
      else next.add(cell);
      return next;
    });
  };

  const onClearWalls = () => setWalls(new Set());

  const onRandomWalls = () => {
    const next = new Set();
    const totalCells = ROWS * COLS;
    const wallCount = Math.floor(totalCells * 0.25);
    while (next.size < wallCount) {
      const c = Math.floor(Math.random() * totalCells);
      if (c !== start && c !== end) next.add(c);
    }
    setWalls(next);
  };

  const onRun = () => {
    const runner = ALGORITHMS[algorithm];
    const opSteps = runner({ rows: ROWS, cols: COLS, start, end, walls });
    setSteps(opSteps);
    const last = opSteps[opSteps.length - 1];
    const label = ALGO_LABELS[algorithm];
    setHistory((prev) => [{ id: Date.now(), label, snapshot: last.path.length > 0 ? `path length ${last.path.length}` : `no path (${last.visited.length} visited)` }, ...prev].slice(0, 16));
    logRun({ algorithm: label, visualizer: 'Pathfinding', inputSize: ROWS * COLS - walls.size, steps: opSteps.length });
  };

  return (
    <div className="sorting-page">
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / PATH LAB</p>
        <h1>PATHFINDING VISUALIZER</h1>
        <p className="subtitle">A real grid search - place walls, move start/end, and compare how each algorithm actually explores.</p>
      </section>
      <GridControls
        algorithm={algorithm}
        setAlgorithm={setAlgorithm}
        editMode={editMode}
        setEditMode={setEditMode}
        onRun={onRun}
        onClearWalls={onClearWalls}
        onRandomWalls={onRandomWalls}
        debuggerProps={{ onStepForward: debuggerState.stepForward, onStepBack: debuggerState.stepBack, onPause: debuggerState.pause, onAutoPlay: debuggerState.autoPlay, isPlaying: debuggerState.isPlaying }}
      />
      <GridStage
        rows={ROWS}
        cols={COLS}
        start={start}
        end={end}
        walls={walls}
        visited={current.visited || []}
        frontier={current.frontier || []}
        current={current.current}
        path={current.path || []}
        editMode={editMode}
        onCellClick={onCellClick}
      />
      <section className="dashboard-grid stage-block stage-delay-4">
        <PathfindingLearningPanel message={current.message} />
        <HistoryPanel title="HISTORY PANEL" items={history} onSelect={(item) => setSteps([{ visited: [], frontier: [], current: null, path: [], message: `Restored ${item.label}: ${item.snapshot}` }])} />
      </section>
    </div>
  );
}

export default PathfindingVisualizer;
