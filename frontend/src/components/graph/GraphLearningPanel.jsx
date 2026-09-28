/**
 * frontend/src/components/graph/GraphLearningPanel.jsx
 *
 * Same three-card layout as SortingLearningPanel: algorithm note, live stats,
 * complexity + current step message. Previously this was a single unlabeled
 * paragraph with no real content.
 */
import PixelNumber from '../shared/PixelNumber.jsx';

const GRAPH_NOTES = {
  bfs: 'Explore layer by layer using a queue (FIFO): visit a node, then enqueue all of its unvisited neighbors before going any deeper.',
  dfs: 'Explore as deep as possible using a stack (LIFO): follow one path all the way down before backtracking to try the next branch.',
};

const COMPLEXITY = {
  bfs: { time: 'O(V + E)', space: 'O(V)' },
  dfs: { time: 'O(V + E)', space: 'O(V)' },
};

function StatRow({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <PixelNumber value={value} active />
    </div>
  );
}

function GraphLearningPanel({ algorithm, stepIndex, totalSteps, visitedCount, frontierCount, message }) {
  const cx = COMPLEXITY[algorithm] || COMPLEXITY.bfs;

  return (
    <>
      <div className="info-card">
        <div className="panel-title">ALGORITHM NOTE</div>
        <p className="sorting-note">{GRAPH_NOTES[algorithm]}</p>
      </div>

      <div className="info-card">
        <div className="panel-title">LIVE STATS</div>
        <div className="sorting-stats-list">
          <StatRow label="STEP" value={stepIndex} />
          <StatRow label="TOTAL STEPS" value={totalSteps} />
          <StatRow label="VISITED" value={visitedCount} />
          <StatRow label={algorithm === 'dfs' ? 'STACK SIZE' : 'QUEUE SIZE'} value={frontierCount} />
        </div>
      </div>

      <div className="info-card">
        <div className="panel-title">COMPLEXITY</div>
        <div className="complexity-list">
          <div>TIME&nbsp;&nbsp;: {cx.time}</div>
          <div>SPACE : {cx.space}</div>
          <div>MODE&nbsp;&nbsp;: STEP + AUTO PLAY</div>
        </div>
        {message && (
          <p className="sorting-note">
            <span className="sorting-note-message">{message}</span>
          </p>
        )}
      </div>
    </>
  );
}

export default GraphLearningPanel;
