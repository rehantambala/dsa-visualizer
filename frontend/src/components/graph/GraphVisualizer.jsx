/**
 * frontend/src/components/graph/GraphVisualizer.jsx
 *
 * Graph Visualizer page. Same architecture as every other visualizer:
 *   hero → controls → visual stage → dashboard grid → learning panel
 *
 * Unlike the old version, the graph here is real and editable: nodes and edges
 * live in state, BFS/DFS are computed on demand from that actual adjacency list
 * (see algorithms/graphStepEngine.js), and the debugger scrubs through the real
 * steps produced by those algorithms.
 */
import { useMemo, useState } from 'react';
import GraphControls from './GraphControls.jsx';
import GraphStage from './GraphStage.jsx';
import GraphLearningPanel from './GraphLearningPanel.jsx';
import HistoryPanel from '../shared/HistoryPanel.jsx';
import { useAlgorithmDebugger } from '../debugger/useAlgorithmDebugger.js';
import { bfsSteps, dfsSteps } from '../../algorithms/graphStepEngine.js';
import { logRun } from '../../utils/logRun.js';

const DEFAULT_NODES = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
const DEFAULT_EDGES = [
  [1, 2],
  [1, 3],
  [2, 4],
  [3, 5],
];

const IDLE_STEP = { visited: [], frontier: [], current: null, edge: null, message: 'Graph ready. Pick a start node and hit RUN.' };

function randomConnectedGraph(nodeCount = 6) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: i + 1 }));
  const edges = [];
  // Guarantee connectivity: chain every node to a random earlier node...
  for (let i = 2; i <= nodeCount; i += 1) {
    const target = Math.floor(Math.random() * (i - 1)) + 1;
    edges.push([target, i]);
  }
  // ...then sprinkle a few extra random edges for cycles.
  const extra = Math.floor(nodeCount / 2);
  for (let i = 0; i < extra; i += 1) {
    const a = Math.floor(Math.random() * nodeCount) + 1;
    const b = Math.floor(Math.random() * nodeCount) + 1;
    if (a !== b && !edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
      edges.push([a, b]);
    }
  }
  return { nodes, edges };
}

function GraphVisualizer() {
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [edges, setEdges] = useState(DEFAULT_EDGES);
  const [algorithm, setAlgorithm] = useState('bfs');
  const [startId, setStartId] = useState(1);
  const [edgeFrom, setEdgeFrom] = useState(1);
  const [edgeTo, setEdgeTo] = useState(2);
  const [steps, setSteps] = useState([IDLE_STEP]);
  const [history, setHistory] = useState([]);

  const debuggerState = useAlgorithmDebugger(steps, 500);
  const current = debuggerState.currentStep || steps[0];

  const nodeIds = useMemo(() => nodes.map((n) => n.id), [nodes]);

  const ensureValidSelections = (nextNodes) => {
    const ids = nextNodes.map((n) => n.id);
    if (!ids.includes(startId)) setStartId(ids[0]);
    if (!ids.includes(edgeFrom)) setEdgeFrom(ids[0]);
    if (!ids.includes(edgeTo)) setEdgeTo(ids[Math.min(1, ids.length - 1)]);
  };

  const onRun = () => {
    if (!nodeIds.includes(startId)) return;
    const generator = algorithm === 'dfs' ? dfsSteps : bfsSteps;
    const nextSteps = generator(nodes, edges, startId);
    setSteps(nextSteps);
    const visitedOrder = nextSteps[nextSteps.length - 1].visited.join(' -> ');
    setHistory((prev) =>
      [
        {
          id: Date.now(),
          label: `${algorithm.toUpperCase()} from ${startId}`,
          snapshot: visitedOrder || '(unreachable nodes skipped)',
        },
        ...prev,
      ].slice(0, 16)
    );
    logRun({ algorithm: algorithm.toUpperCase(), visualizer: 'Graph', inputSize: nodes.length, steps: nextSteps.length });
  };

  const onAddNode = () => {
    const nextId = nodes.length > 0 ? Math.max(...nodeIds) + 1 : 1;
    const nextNodes = [...nodes, { id: nextId }];
    setNodes(nextNodes);
    setSteps([IDLE_STEP]);
  };

  const onRemoveNode = () => {
    if (nodes.length <= 1) return;
    const removedId = nodeIds[nodeIds.length - 1];
    const nextNodes = nodes.slice(0, -1);
    const nextEdges = edges.filter(([a, b]) => a !== removedId && b !== removedId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    ensureValidSelections(nextNodes);
    setSteps([IDLE_STEP]);
  };

  const onAddEdge = () => {
    if (edgeFrom === edgeTo) return;
    const exists = edges.some(
      ([a, b]) => (a === edgeFrom && b === edgeTo) || (a === edgeTo && b === edgeFrom)
    );
    if (exists) return;
    setEdges((prev) => [...prev, [edgeFrom, edgeTo]]);
    setSteps([IDLE_STEP]);
  };

  const onRandomize = () => {
    const { nodes: nextNodes, edges: nextEdges } = randomConnectedGraph(
      Math.floor(Math.random() * 3) + 5
    );
    setNodes(nextNodes);
    setEdges(nextEdges);
    ensureValidSelections(nextNodes);
    setSteps([IDLE_STEP]);
  };

  return (
    <div className="sorting-page">
      <section className="hero stage-block stage-delay-1">
        <p className="eyebrow">PIXEL MODE / GRAPH LAB</p>
        <h1>GRAPH VISUALIZER</h1>
        <p className="subtitle">
          Build your own graph, then step through a real BFS or DFS traversal computed live from
          your nodes and edges.
        </p>
      </section>

      <GraphControls
        algorithm={algorithm}
        setAlgorithm={setAlgorithm}
        startId={startId}
        setStartId={setStartId}
        nodes={nodes}
        onRun={onRun}
        onAddNode={onAddNode}
        onRemoveNode={onRemoveNode}
        onAddEdge={onAddEdge}
        onRandomize={onRandomize}
        edgeFrom={edgeFrom}
        setEdgeFrom={setEdgeFrom}
        edgeTo={edgeTo}
        setEdgeTo={setEdgeTo}
        debuggerProps={{
          onStepForward: debuggerState.stepForward,
          onStepBack: debuggerState.stepBack,
          onPause: debuggerState.pause,
          onAutoPlay: debuggerState.autoPlay,
          isPlaying: debuggerState.isPlaying,
        }}
      />

      <GraphStage
        nodes={nodes}
        edges={edges}
        current={current.current}
        visited={current.visited || []}
        frontier={current.frontier || []}
        activeEdge={current.edge}
      />

      <section className="dashboard-grid stage-block stage-delay-4">
        <GraphLearningPanel
          algorithm={algorithm}
          stepIndex={debuggerState.stepIndex}
          totalSteps={steps.length - 1}
          visitedCount={(current.visited || []).length}
          frontierCount={(current.frontier || []).length}
          message={current.message}
        />
        <HistoryPanel
          title="RUN HISTORY"
          items={history}
          onSelect={() => {
            debuggerState.reset();
            setSteps([IDLE_STEP]);
          }}
        />
      </section>
    </div>
  );
}

export default GraphVisualizer;
