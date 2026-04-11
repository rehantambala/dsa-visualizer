import "../sorting/sorting.css";
import { useState } from 'react';
import GraphControls from './GraphControls.jsx';
import GraphStage from './GraphStage.jsx';
import GraphLearningPanel from './GraphLearningPanel.jsx';
import HistoryPanel from '../shared/HistoryPanel.jsx';
import { useAlgorithmDebugger } from '../debugger/useAlgorithmDebugger.js';

const BASE_NODES = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
const BASE_EDGES = [[1, 2], [1, 3], [2, 4], [3, 5]];

function GraphVisualizer() {
  const [algorithm, setAlgorithm] = useState('bfs');
  const [steps, setSteps] = useState([{ activeNodes: [], message: 'Graph ready.' }]);
  const [history, setHistory] = useState([]);
  const debuggerState = useAlgorithmDebugger(steps, 260);
  const current = debuggerState.currentStep || steps[0];

  const onRun = () => {
    const order = algorithm === 'dfs' ? [1, 3, 5, 2, 4] : [1, 2, 3, 4, 5];
    const nextSteps = order.map((id, idx) => ({ activeNodes: order.slice(0, idx + 1), message: `${algorithm.toUpperCase()} visiting node ${id}` }));
    setSteps(nextSteps);
    setHistory((prev) => [{ id: Date.now(), label: algorithm, snapshot: order.join(' -> ') }, ...prev].slice(0, 16));
  };

  return (
    <div className="sorting-page">
      <section className="hero stage-block stage-delay-1"><p className="eyebrow">PIXEL MODE / GRAPH LAB</p><h1>GRAPH VISUALIZER</h1></section>
      <GraphControls algorithm={algorithm} setAlgorithm={setAlgorithm} onRun={onRun} debuggerProps={{ onStepForward: debuggerState.stepForward, onStepBack: debuggerState.stepBack, onPause: debuggerState.pause, onAutoPlay: debuggerState.autoPlay, isPlaying: debuggerState.isPlaying }} />
      <GraphStage nodes={BASE_NODES} edges={BASE_EDGES} activeNodes={current.activeNodes || []} />
      <section className="dashboard-grid stage-block stage-delay-4">
        <GraphLearningPanel message={current.message} />
        <HistoryPanel title="HISTORY PANEL" items={history} onSelect={(item) => setSteps([{ activeNodes: [], message: `Restored ${item.label}: ${item.snapshot}` }])} />
      </section>
    </div>
  );
}

export default GraphVisualizer;
