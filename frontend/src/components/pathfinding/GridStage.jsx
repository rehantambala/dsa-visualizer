/**
 * frontend/src/components/pathfinding/GridStage.jsx
 *
 * REBUILT: previously a static 10x10 grid that only ever lit up cells from a
 * hardcoded path - no walls, no way to set start/end, nothing interactive. Now
 * it's a real editable grid: click a cell to place a wall / start / end depending
 * on `editMode`, and the visited/frontier/path coloring reflects a real search.
 */
function GridStage({ rows, cols, start, end, walls, visited = [], frontier = [], current, path = [], editMode, onCellClick }) {
  const cells = Array.from({ length: rows * cols }, (_, i) => i);

  const classForCell = (c) => {
    if (c === start) return 'grid-cell-start';
    if (c === end) return 'grid-cell-end';
    if (walls.has(c)) return 'grid-cell-wall';
    if (path.includes(c)) return 'grid-cell-path';
    if (c === current) return 'grid-cell-current';
    if (visited.includes(c)) return 'grid-cell-visited';
    if (frontier.includes(c)) return 'grid-cell-frontier';
    return '';
  };

  return (
    <section className="visual-panel stage-block stage-delay-3">
      <div className="visual-header">
        <div className="panel-title">GRID STAGE</div>
        <div className="visual-hint">
          Click a cell to {editMode === 'wall' ? 'toggle a wall' : editMode === 'start' ? 'move the start' : 'move the end'}. Pink = visited, gold trail = final path.
        </div>
      </div>
      <div className="grid-stage" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cells.map((c) => (
          <button
            key={c}
            type="button"
            className={`grid-cell ${classForCell(c)}`}
            onClick={() => onCellClick(c)}
            aria-label={`cell ${c}`}
          />
        ))}
      </div>
    </section>
  );
}

export default GridStage;
