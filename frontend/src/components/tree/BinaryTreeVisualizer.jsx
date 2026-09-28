/**
 * frontend/src/components/tree/BinaryTreeVisualizer.jsx
 *
 * REBUILT: this used to keep a sorted flat array and call it a "tree" - no actual
 * left/right children, no recursive BST logic at all. It now owns a real BST root
 * (frontend/src/algorithms/treeStepEngine.js) and every operation (insert, delete,
 * search, 4 traversal orders) walks the actual tree, comparing node.value at each
 * step, with a full snapshot per step so the debugger can scrub through it.
 */
import { useState } from 'react';
import BinaryTreeControls from './BinaryTreeControls.jsx';
import BinaryTreeStage from './BinaryTreeStage.jsx';
import BinaryTreeLearningPanel from './BinaryTreeLearningPanel.jsx';
import HistoryPanel from '../shared/HistoryPanel.jsx';
import Reveal from '../shared/Reveal.jsx';
import { useAlgorithmDebugger } from '../debugger/useAlgorithmDebugger.js';
import { insertSteps, deleteSteps, searchSteps, traverseSteps, treeToValues, buildTreeFromValues } from '../../algorithms/treeStepEngine.js';
import { logRun } from '../../utils/logRun.js';

function BinaryTreeVisualizer() {
  const [value, setValue] = useState('');
  const [root, setRoot] = useState(null);
  const [steps, setSteps] = useState([{ tree: null, activeId: null, visitedIds: [], message: 'Tree ready. Insert a value to build the root.' }]);
  const [history, setHistory] = useState([]);
  const debuggerState = useAlgorithmDebugger(steps, 500);
  const current = debuggerState.currentStep || steps[0];

  const pushHistory = (label) => {
    const snapshot = treeToValues(root).join(',');
    setHistory((prev) => [{ id: Date.now(), label, snapshot: `[${snapshot}]` }, ...prev].slice(0, 16));
  };

  const runOperation = (label, resultSteps, nextRoot, algorithmName) => {
    setSteps(resultSteps);
    if (nextRoot !== undefined) setRoot(nextRoot);
    pushHistory(label);
    logRun({ algorithm: algorithmName, visualizer: 'Binary Tree', inputSize: treeToValues(nextRoot !== undefined ? nextRoot : root).length, steps: resultSteps.length });
  };

  const handleInsert = () => {
    const n = Number(value);
    if (Number.isNaN(n) || value === '') return;
    const { root: next, steps: opSteps } = insertSteps(root, n);
    runOperation(`insert(${n})`, opSteps, next, 'BST Insert');
    setValue('');
  };

  const handleDelete = () => {
    const n = Number(value);
    if (Number.isNaN(n) || value === '') return;
    const { root: next, steps: opSteps } = deleteSteps(root, n);
    runOperation(`delete(${n})`, opSteps, next, 'BST Delete');
    setValue('');
  };

  const handleSearch = () => {
    const n = Number(value);
    if (Number.isNaN(n) || value === '') return;
    const { steps: opSteps } = searchSteps(root, n);
    setSteps(opSteps);
    logRun({ algorithm: 'BST Search', visualizer: 'Binary Tree', inputSize: treeToValues(root).length, steps: opSteps.length });
  };

  const handleTraverse = (type) => {
    const opSteps = traverseSteps(root, type);
    setSteps(opSteps);
    pushHistory(`${type} traversal`);
    logRun({ algorithm: `${type} traversal`, visualizer: 'Binary Tree', inputSize: treeToValues(root).length, steps: opSteps.length });
  };

  const handleRestore = (item) => {
    const values = item.snapshot.replace(/[[\]\s]/g, '').split(',').filter(Boolean).map(Number);
    const rebuilt = buildTreeFromValues(values);
    setRoot(rebuilt);
    setSteps([{ tree: rebuilt, activeId: null, visitedIds: [], message: `Restored ${item.label}` }]);
  };

  return (
    <div className="sorting-page">
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / TREE LAB</p>
        <h1>BINARY TREE VISUALIZER</h1>
        <p className="subtitle">A real BST - insert/delete/search walk actual left/right children, comparing values node by node.</p>
      </section>
      <BinaryTreeControls
        value={value}
        setValue={setValue}
        onInsert={handleInsert}
        onDelete={handleDelete}
        onSearch={handleSearch}
        onTraverse={handleTraverse}
        debuggerProps={{ onStepForward: debuggerState.stepForward, onStepBack: debuggerState.stepBack, onPause: debuggerState.pause, onAutoPlay: debuggerState.autoPlay, isPlaying: debuggerState.isPlaying }}
      />
      <BinaryTreeStage tree={current.tree} activeId={current.activeId} visitedIds={current.visitedIds} />
      <Reveal as="section" className="dashboard-grid">
        <BinaryTreeLearningPanel message={current.message} />
        <HistoryPanel title="HISTORY PANEL" items={history} onSelect={handleRestore} />
      </Reveal>
    </div>
  );
}

export default BinaryTreeVisualizer;
