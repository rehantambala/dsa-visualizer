import "../sorting/sorting.css";
import { useState } from 'react';
import GridControls from './GridControls.jsx';
import GridStage from './GridStage.jsx';
import PathfindingLearningPanel from './PathfindingLearningPanel.jsx';
import HistoryPanel from '../shared/HistoryPanel.jsx';
import { useAlgorithmDebugger } from '../debugger/useAlgorithmDebugger.js';

function PathfindingVisualizer() {
  const [algorithm, setAlgorithm] = useState('dijkstra');
  const [steps, setSteps] = useState([{ visited: [], message: 'Grid ready.' }]);
  const [history, setHistory] = useState([]);
  const debuggerState = useAlgorithmDebugger(steps, 100);
  const current = debuggerState.currentStep || steps[0];

  const onRun = () => {
    const path = [0, 1, 2, 12, 22, 32, 42, 52, 62, 72, 82, 92, 93, 94, 95, 96, 97, 98, 99];
    setSteps(path.map((_, i) => ({ visited: path.slice(0, i + 1), message: `${algorithm} expanded ${i + 1} nodes.` })));
    setHistory((prev) => [{ id: Date.now(), label: algorithm, snapshot: `visited ${path.length}` }, ...prev].slice(0, 16));
  };

  return (
    <div className="sorting-page">
      <section className="hero stage-block stage-delay-1"><p className="eyebrow">PIXEL MODE / PATH LAB</p><h1>PATHFINDING VISUALIZER</h1></section>
      <GridControls algorithm={algorithm} setAlgorithm={setAlgorithm} onRun={onRun} debuggerProps={{ onStepForward: debuggerState.stepForward, onStepBack: debuggerState.stepBack, onPause: debuggerState.pause, onAutoPlay: debuggerState.autoPlay, isPlaying: debuggerState.isPlaying }} />
      <GridStage visited={current.visited || []} />
      <section className="dashboard-grid stage-block stage-delay-4">
        <PathfindingLearningPanel message={current.message} />
        <HistoryPanel title="HISTORY PANEL" items={history} onSelect={(item) => setSteps([{ visited: [], message: `Restored ${item.label}` }])} />
      </section>
    </div>
  );
}

export default PathfindingVisualizer;
