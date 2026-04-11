import { useMemo, useState } from 'react';
import BinaryTreeControls from './BinaryTreeControls.jsx';
import BinaryTreeStage from './BinaryTreeStage.jsx';
import BinaryTreeLearningPanel from './BinaryTreeLearningPanel.jsx';
import HistoryPanel from '../shared/HistoryPanel.jsx';
import { useAlgorithmDebugger } from '../debugger/useAlgorithmDebugger.js';

const makeStep = (nodes, message, active = null) => ({ nodes, message, active });

function BinaryTreeVisualizer() {
  const [value, setValue] = useState('');
  const [steps, setSteps] = useState([makeStep([], 'Tree ready.')]);
  const [history, setHistory] = useState([]);
  const debuggerState = useAlgorithmDebugger(steps, 260);
  const current = debuggerState.currentStep || steps[0];

  const pushHistory = (label, snapshot) => setHistory((prev) => [{ id: Date.now(), label, snapshot }, ...prev].slice(0, 16));

  const values = useMemo(() => current.nodes.map((n) => n.value), [current.nodes]);
  const rebuild = (arr, msg) => setSteps([makeStep(arr.map((v, i) => ({ id: i + 1, value: v, label: `NODE ${i}` })), msg)]);

  const handleInsert = () => {
    const n = Number(value); if (Number.isNaN(n)) return;
    const next = [...values, n].sort((a, b) => a - b);
    rebuild(next, `Inserted ${n} in BST order.`); pushHistory(`insert(${n})`, `[${next.join(', ')}]`);
  };
  const handleDelete = () => {
    const n = Number(value); if (Number.isNaN(n)) return;
    const idx = values.indexOf(n); if (idx < 0) return;
    const next = values.filter((_, i) => i !== idx); rebuild(next, `Deleted ${n} from BST.`); pushHistory(`delete(${n})`, `[${next.join(', ')}]`);
  };
  const handleSearch = () => {
    const n = Number(value); if (Number.isNaN(n)) return;
    const found = values.includes(n); setSteps([makeStep(current.nodes, found ? `Found ${n}.` : `${n} not found.`)]);
  };
  const handleTraverse = (type) => setSteps([makeStep(current.nodes, `${type} traversal: ${values.join(' -> ')}`)]);

  return (
    <div className="sorting-page">
      <section className="hero stage-block stage-delay-1"><p className="eyebrow">PIXEL MODE / TREE LAB</p><h1>BINARY TREE VISUALIZER</h1></section>
      <BinaryTreeControls
        value={value}
        setValue={setValue}
        onInsert={handleInsert}
        onDelete={handleDelete}
        onSearch={handleSearch}
        onTraverse={handleTraverse}
        debuggerProps={{ onStepForward: debuggerState.stepForward, onStepBack: debuggerState.stepBack, onPause: debuggerState.pause, onAutoPlay: debuggerState.autoPlay, isPlaying: debuggerState.isPlaying }}
      />
      <BinaryTreeStage nodes={current.nodes} active={current.active} />
      <section className="dashboard-grid stage-block stage-delay-4">
        <BinaryTreeLearningPanel message={current.message} />
        <HistoryPanel title="HISTORY PANEL" items={history} onSelect={(item) => setSteps([makeStep(item.snapshot.replace(/[[\]\s]/g, '').split(',').filter(Boolean).map(Number).map((v, i) => ({ id: i + 1, value: v, label: `NODE ${i}` })), `Restored ${item.label}`)])} />
      </section>
    </div>
  );
}

export default BinaryTreeVisualizer;
