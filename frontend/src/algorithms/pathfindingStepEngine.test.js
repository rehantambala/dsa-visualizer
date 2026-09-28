import { describe, it, expect } from 'vitest';
import { bfsSteps, dijkstraSteps, astarSteps, greedySteps, ALGORITHMS } from './pathfindingStepEngine.js';

function makeGrid(overrides = {}) {
  return { rows: 10, cols: 10, start: 0, end: 99, walls: new Set(), ...overrides };
}

describe('pathfindingStepEngine', () => {
  it('finds the same optimal path length across all four algorithms on an open grid', () => {
    const grid = makeGrid();
    const results = Object.values(ALGORITHMS).map((fn) => fn(grid));
    const pathLengths = results.map((steps) => steps[steps.length - 1].path.length);
    // corner to corner on a 10x10 grid: Manhattan distance 18 -> 19 cells inclusive
    pathLengths.forEach((len) => expect(len).toBe(19));
  });

  it('A* and Greedy explore fewer cells than BFS/Dijkstra on the same maze (proves they are not the same fake path)', () => {
    const walls = new Set();
    for (let c = 0; c < 10; c += 1) if (c !== 5) walls.add(3 * 10 + c); // wall row with one gap
    const grid = makeGrid({ walls });

    const bfsVisited = bfsSteps(grid).at(-1).visited.length;
    const dijkstraVisited = dijkstraSteps(grid).at(-1).visited.length;
    const astarVisited = astarSteps(grid).at(-1).visited.length;
    const greedyVisited = greedySteps(grid).at(-1).visited.length;

    expect(astarVisited).toBeLessThan(bfsVisited);
    expect(greedyVisited).toBeLessThan(astarVisited);
    expect(dijkstraVisited).toBe(bfsVisited); // uniform weights -> same expansion order as BFS
  });

  it('routes around walls instead of through them', () => {
    const walls = new Set();
    for (let c = 0; c < 10; c += 1) if (c !== 5) walls.add(3 * 10 + c);
    const grid = makeGrid({ walls });
    const path = bfsSteps(grid).at(-1).path;
    expect(path.length).toBeGreaterThan(0);
    path.forEach((cell) => expect(walls.has(cell)).toBe(false));
    expect(path).toContain(35); // must funnel through the single gap
  });

  it('reports no path when the target is fully walled off', () => {
    const walls = new Set();
    for (let c = 0; c < 10; c += 1) walls.add(5 * 10 + c); // full row, no gap
    const grid = makeGrid({ walls });
    const last = bfsSteps(grid).at(-1);
    expect(last.path).toEqual([]);
    expect(last.message.toLowerCase()).toContain('no path');
  });

  it('handles start === end as an immediate trivial path', () => {
    const grid = makeGrid({ start: 42, end: 42 });
    const last = bfsSteps(grid).at(-1);
    expect(last.path).toEqual([42]);
  });
});
