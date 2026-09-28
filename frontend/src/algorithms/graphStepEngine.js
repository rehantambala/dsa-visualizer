/**
 * frontend/src/algorithms/graphStepEngine.js
 *
 * Real BFS and DFS implementations that walk an actual adjacency list and emit one
 * step per state change, so the visualizer can scrub through real algorithm behavior
 * instead of replaying a hardcoded order.
 *
 * A "step" looks like:
 * {
 *   visited: number[],   // nodes fully processed so far, in order
 *   frontier: number[],  // the queue (BFS) or stack (DFS) at this moment
 *   current: number|null,// node just dequeued/popped and marked visited
 *   edge: [number, number] | null, // the edge just traversed to reach `current`
 *   message: string,
 * }
 */

function buildAdjacency(nodes, edges) {
  const adjacency = new Map(nodes.map((n) => [n.id, []]));
  edges.forEach(([a, b]) => {
    if (adjacency.has(a) && adjacency.has(b)) {
      adjacency.get(a).push(b);
      adjacency.get(b).push(a);
    }
  });
  // Deterministic traversal order: visit lower ids first.
  adjacency.forEach((neighbors) => neighbors.sort((x, y) => x - y));
  return adjacency;
}

export function bfsSteps(nodes, edges, startId) {
  const adjacency = buildAdjacency(nodes, edges);
  const steps = [];
  const visited = [];
  // Head-index queue instead of Array.shift(), which is O(n) per call because it
  // re-indexes every remaining element. Advancing `head` is O(1); the array only
  // ever grows at the tail.
  const queue = [startId];
  let head = 0;
  const seen = new Set([startId]);
  const frontierView = () => queue.slice(head);

  steps.push({
    visited: [],
    frontier: frontierView(),
    current: null,
    edge: null,
    message: `Starting BFS from node ${startId}. Node ${startId} added to the queue.`,
  });

  while (head < queue.length) {
    const node = queue[head];
    head += 1;
    visited.push(node);

    steps.push({
      visited: [...visited],
      frontier: frontierView(),
      current: node,
      edge: null,
      message: `Dequeued node ${node}. Marking it visited.`,
    });

    const neighbors = adjacency.get(node) || [];
    neighbors.forEach((neighbor) => {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        queue.push(neighbor);
        steps.push({
          visited: [...visited],
          frontier: frontierView(),
          current: node,
          edge: [node, neighbor],
          message: `Visiting neighbor ${neighbor} of node ${node}. Added ${neighbor} to the queue.`,
        });
      }
    });
  }

  steps.push({
    visited: [...visited],
    frontier: [],
    current: null,
    edge: null,
    message: `BFS complete. Visited order: ${visited.join(" → ")}.`,
  });

  return steps;
}

export function dfsSteps(nodes, edges, startId) {
  const adjacency = buildAdjacency(nodes, edges);
  const steps = [];
  const visited = [];
  const stack = [startId];
  const seen = new Set();

  steps.push({
    visited: [],
    frontier: [...stack],
    current: null,
    edge: null,
    message: `Starting DFS from node ${startId}. Node ${startId} pushed onto the stack.`,
  });

  while (stack.length > 0) {
    const node = stack.pop();
    if (seen.has(node)) {
      continue;
    }
    seen.add(node);
    visited.push(node);

    steps.push({
      visited: [...visited],
      frontier: [...stack],
      current: node,
      edge: null,
      message: `Popped node ${node}. Marking it visited.`,
    });

    const neighbors = adjacency.get(node) || [];
    // Reverse so the smallest-id neighbor ends up on top of the stack (visited first).
    [...neighbors].reverse().forEach((neighbor) => {
      if (!seen.has(neighbor)) {
        stack.push(neighbor);
        steps.push({
          visited: [...visited],
          frontier: [...stack],
          current: node,
          edge: [node, neighbor],
          message: `Pushed neighbor ${neighbor} of node ${node} onto the stack.`,
        });
      }
    });
  }

  steps.push({
    visited: [...visited],
    frontier: [],
    current: null,
    edge: null,
    message: `DFS complete. Visited order: ${visited.join(" → ")}.`,
  });

  return steps;
}

// Even circular layout so the graph doesn't need manual x/y bookkeeping as nodes
// are added or removed.
export function circularLayout(nodes, radius = 140, center = { x: 200, y: 180 }) {
  const count = nodes.length || 1;
  return nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / count - Math.PI / 2;
    return {
      ...node,
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  });
}
