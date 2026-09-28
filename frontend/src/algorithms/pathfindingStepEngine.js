/**
 * frontend/src/algorithms/pathfindingStepEngine.js
 *
 * Real grid search: BFS, Dijkstra, Greedy Best-First, and A* all run against an
 * actual grid with walls and 4-directional neighbors, and each produces one step
 * per node expansion. Previously onRun() returned the SAME hardcoded 19-cell path
 * no matter which algorithm was selected, and there were no walls at all.
 *
 * A "step" looks like:
 * { visited: number[], frontier: number[], current: number|null, path: number[], message: string }
 * path is only populated on the final step once (or if) the end is reached.
 */

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function neighborsOf(index, rows, cols, walls) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const result = [];
  for (const [dr, dc] of DIRS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const idx = nr * cols + nc;
    if (walls.has(idx)) continue;
    result.push(idx);
  }
  return result;
}

function manhattan(a, b, cols) {
  const ar = Math.floor(a / cols);
  const ac = a % cols;
  const br = Math.floor(b / cols);
  const bc = b % cols;
  return Math.abs(ar - br) + Math.abs(ac - bc);
}

function reconstructPath(cameFrom, end, start) {
  const path = [end];
  let cur = end;
  while (cur !== start && cameFrom.has(cur)) {
    cur = cameFrom.get(cur);
    path.unshift(cur);
  }
  return path;
}

/**
 * Binary min-heap keyed by a numeric priority. Supports lazy deletion: instead
 * of paying O(n) to remove or decrease-key an arbitrary entry (what the old
 * popLowest() did on every single expansion by rescanning the whole open set),
 * we just push a fresh [key, node] pair whenever a node's priority improves.
 * Stale pairs are skipped cheaply when popped, by checking them against the
 * caller's source-of-truth maps (openSet / gScore). Push and pop are O(log n).
 */
class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(key, node) {
    this.items.push([key, node]);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent][0] <= this.items[i][0]) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop() {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      const n = this.items.length;
      for (;;) {
        let smallest = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        if (l < n && this.items[l][0] < this.items[smallest][0]) smallest = l;
        if (r < n && this.items[r][0] < this.items[smallest][0]) smallest = r;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

// Shared driver for BFS / Dijkstra (uniform weight=1) / Greedy Best-First / A*.
// `mode` decides how each frontier node's priority key is computed:
//   'fifo'      - BFS: plain queue order (O(1) head-index pop, no key needed)
//   'gScore'    - Dijkstra: distance-from-start
//   'heuristic' - Greedy: straight-line distance to target only
//   'fScore'    - A*: distance-from-start + heuristic
// Dijkstra/Greedy/A* all pop the frontier via the min-heap above instead of
// scanning the whole open set on every expansion.
function search({ rows, cols, start, end, walls }, label, mode) {
  const steps = [];
  const cameFrom = new Map();
  const gScore = new Map([[start, 0]]);
  const visited = [];
  const visitedSet = new Set();
  const openSet = new Set([start]);

  const keyFor = (node, g) => {
    if (mode === 'gScore') return g;
    if (mode === 'heuristic') return manhattan(node, end, cols);
    if (mode === 'fScore') return g + manhattan(node, end, cols);
    return 0;
  };

  // FIFO queue for BFS uses a head index instead of Array.shift() (O(n) per call).
  const fifoQueue = mode === 'fifo' ? [start] : null;
  let fifoHead = 0;
  const heap = mode === 'fifo' ? null : new MinHeap();
  if (heap) heap.push(keyFor(start, 0), start);

  steps.push({ visited: [], frontier: [start], current: null, path: [], message: `${label}: starting from cell ${start}, target is ${end}.` });

  if (start === end) {
    steps.push({ visited: [], frontier: [], current: start, path: [start], message: `Start and end are the same cell.` });
    return steps;
  }

  let guard = 0;
  while (openSet.size > 0 && guard < 5000) {
    guard += 1;

    let node = null;
    if (mode === 'fifo') {
      while (fifoHead < fifoQueue.length && !openSet.has(fifoQueue[fifoHead])) fifoHead += 1;
      node = fifoHead < fifoQueue.length ? fifoQueue[fifoHead] : null;
      if (node !== null) fifoHead += 1;
    } else {
      for (;;) {
        const entry = heap.pop();
        if (!entry) break;
        const [key, n] = entry;
        if (!openSet.has(n)) continue; // stale: already expanded
        if (key !== keyFor(n, gScore.get(n) ?? Infinity)) continue; // stale: superseded by a better key
        node = n;
        break;
      }
    }
    if (node === null) break;
    openSet.delete(node);

    visited.push(node);
    visitedSet.add(node);

    if (node === end) {
      const path = reconstructPath(cameFrom, end, start);
      steps.push({ visited: [...visited], frontier: [...openSet], current: node, path, message: `${label}: reached the target after expanding ${visited.length} node(s). Path length: ${path.length}.` });
      return steps;
    }

    steps.push({ visited: [...visited], frontier: [...openSet], current: node, path: [], message: `${label}: expanding cell ${node} (${visited.length} node(s) visited so far).` });

    const neighbors = neighborsOf(node, rows, cols, walls);
    for (const next of neighbors) {
      if (visitedSet.has(next)) continue;
      const tentativeG = (gScore.get(node) ?? 0) + 1;
      if (tentativeG < (gScore.get(next) ?? Infinity)) {
        cameFrom.set(next, node);
        gScore.set(next, tentativeG);
        const wasNew = !openSet.has(next);
        openSet.add(next);
        if (mode === 'fifo') {
          if (wasNew) fifoQueue.push(next);
        } else {
          heap.push(keyFor(next, tentativeG), next);
        }
      }
    }
  }

  steps.push({ visited: [...visited], frontier: [], current: null, path: [], message: `${label}: exhausted all reachable cells (${visited.length} visited). No path exists - the target is blocked off by walls.` });
  return steps;
}

export function bfsSteps(grid) {
  return search(grid, 'BFS', 'fifo');
}

export function dijkstraSteps(grid) {
  return search(grid, 'Dijkstra', 'gScore');
}

export function greedySteps(grid) {
  return search(grid, 'Greedy Best-First Search', 'heuristic');
}

export function astarSteps(grid) {
  return search(grid, 'A*', 'fScore');
}

export const ALGORITHMS = {
  bfs: bfsSteps,
  dijkstra: dijkstraSteps,
  astar: astarSteps,
  greedy: greedySteps,
};
