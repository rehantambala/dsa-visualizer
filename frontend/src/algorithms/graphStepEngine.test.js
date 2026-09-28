import { describe, it, expect } from 'vitest';
import { bfsSteps, dfsSteps, circularLayout } from './graphStepEngine.js';

const NODES = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
const EDGES = [
  [1, 2],
  [1, 3],
  [2, 4],
  [3, 5],
];

describe('graphStepEngine', () => {
  it('BFS visits every reachable node exactly once, in breadth-first order', () => {
    const steps = bfsSteps(NODES, EDGES, 1);
    const visited = steps.at(-1).visited;
    expect(visited).toEqual([1, 2, 3, 4, 5]); // level order: 1, then its neighbors 2/3, then 4/5
    expect(new Set(visited).size).toBe(visited.length); // no duplicates
  });

  it('DFS visits every reachable node exactly once', () => {
    const steps = dfsSteps(NODES, EDGES, 1);
    const visited = steps.at(-1).visited;
    expect(visited).toHaveLength(5);
    expect(new Set(visited)).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('does not visit disconnected nodes', () => {
    const disconnected = [{ id: 1 }, { id: 2 }, { id: 99 }];
    const edges = [[1, 2]];
    const bfsVisited = bfsSteps(disconnected, edges, 1).at(-1).visited;
    const dfsVisited = dfsSteps(disconnected, edges, 1).at(-1).visited;
    expect(bfsVisited).not.toContain(99);
    expect(dfsVisited).not.toContain(99);
  });

  it('circularLayout places every node and returns finite coordinates', () => {
    const layout = circularLayout(NODES);
    expect(layout).toHaveLength(NODES.length);
    layout.forEach((p) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    });
  });
});
