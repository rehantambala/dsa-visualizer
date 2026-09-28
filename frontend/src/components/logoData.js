/**
 * frontend/src/components/logoData.js
 *
 * Single source of truth for every logo variant. Plain JS (no JSX/CSS) so
 * both Logo.jsx and scripts/build-icons.mjs (favicon + apple-touch-icon)
 * can import it - the rendered mark and the icon files can't drift.
 *
 * Rects are [x, y, w, h] in grid units. Each variant:
 *   size, walls, path ([x, y] cells), explored ([x, y, d] cells), start, goal
 *
 * - CLEAN    16x16 - navbar (mode="live") and static uses
 * - EXPLORED 24x24 - intro screen; geometry copied from design/intro-reference.html
 * - TILE     18x18 - favicon: dark square, 1px pink frame, CLEAN inset by 1
 */

const V16_LEFT = [[2,2],[2,3],[3,4],[3,5],[4,6],[4,7],[5,8],[5,9],[6,10],[6,11],[7,12],[7,13]];
const mirror = (left, size) => [...left, ...left.slice().reverse().map(([x, y]) => [size - 1 - x, y])];

export const CLEAN = {
  size: 16,
  walls: [[5,3,6,1],[7,6,2,4],[0,6,1,5],[15,6,1,5],[11,14,5,1]],
  path: mirror(V16_LEFT, 16),
  explored: [],
  start: [1,0,2,2],
  goal: [13,0,2,2],
};

// ---- EXPLORED: same logic as the reference's "1. LOGO" block ----
const V24_LEFT = [];
for (let y = 3; y <= 20; y++) V24_LEFT.push([3 + Math.floor((y - 3) * 8 / 17), y]);
const V24_PATH = mirror(V24_LEFT, 24);
const V24_WALLS = [[8,5,8,1],[11,10,2,6],[0,8,1,8],[23,8,1,8],[0,22,7,1],[17,22,7,1],[4,14,1,4],[19,14,1,4],[19,11,3,1],[6,2,1,2]];

function exploredCells(path, walls) {
  const inWall = (x, y) => walls.some(([a, b, w, h]) => x >= a && x < a + w && y >= b && y < b + h);
  const onPath = new Set(path.map((p) => p + ''));
  const out = [];
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    if (onPath.has([x, y] + '') || inWall(x, y)) continue;
    if (((x >= 2 && x <= 4) || (x >= 19 && x <= 21)) && y <= 2) continue;
    let best = 99, idx = 0;
    path.forEach(([px, py], i) => { const d = Math.abs(px - x) + Math.abs(py - y); if (d < best) { best = d; idx = i; } });
    if (best <= 2) out.push([x, y, idx + best * 2]);
  }
  return out;
}

export const EXPLORED = {
  size: 24,
  walls: V24_WALLS,
  path: V24_PATH,
  explored: exploredCells(V24_PATH, V24_WALLS),
  start: [2,0,3,3],
  goal: [19,0,3,3],
};

export const TILE = { size: 18, inner: CLEAN, bg: '#0b070a', frameOpacity: 0.55 };

export const VARIANTS = { clean: CLEAN, explored: EXPLORED };

// Intro timeline (ms), identical to the reference's "3. INTRO TIMELINE":
// walls → start → explored flood → V path → goal.
export const INTRO = {
  wall: (i) => i * 45,
  start: 450,
  explored: (d) => 600 + d * 28,
  path: (i) => 1500 + i * 38,
  end: (v) => 1500 + v.path.length * 38, // goal lights up here
};

export const COLORS = { wall: '#6d5b66', node: '#ffffff', pink: '#ff2c8f' };

// Static SVG string (used by the icon build script).
export function tileSvg() {
  const { size, inner, bg, frameOpacity } = TILE;
  const r = ([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  const frame = [[0,0,size,1],[0,size-1,size,1],[0,1,1,size-2],[size-1,1,1,size-2]];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
<rect width="${size}" height="${size}" fill="${bg}"/>
<g fill="${COLORS.pink}" fill-opacity="${frameOpacity}">${frame.map(r).join('')}</g>
<g transform="translate(1 1)">
<g fill="${COLORS.wall}">${inner.walls.map(r).join('')}</g>
<g fill="${COLORS.pink}">${inner.path.map(([x, y]) => r([x, y, 1, 1])).join('')}</g>
<g fill="${COLORS.node}">${r(inner.start)}${r(inner.goal)}</g>
</g>
</svg>
`;
}
