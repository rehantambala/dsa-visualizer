/**
 * frontend/src/components/Logo.jsx
 *
 * Pixel-grid mark: a start node and a goal node joined by a traced path
 * through a few maze walls. Geometry lives in logoData.js (shared with the
 * favicon build script).
 *
 * variant: "clean" (16x16, navbar/static) | "explored" (24x24, intro screen)
 * mode:    "static" | "live" (path re-traces in a loop) | "intro" (reference
 *          timeline: walls → start → explored flood → V path → goal)
 */
import { VARIANTS, INTRO } from './logoData.js';
import './logo.css';

const ms = (n) => ({ '--d': `${n}ms` });

export default function Logo({ variant = 'clean', mode = 'static', size = 32, className = '' }) {
  const v = VARIANTS[variant];
  return (
    <svg viewBox={`0 0 ${v.size} ${v.size}`} width={size} height={size} shapeRendering="crispEdges"
      className={`logo logo--${mode} ${className}`} role="img" aria-label="DSA Visualizer">
      {v.explored.map(([x, y, d], i) => (
        <rect key={'e' + i} className="logo__explored" x={x} y={y} width="1" height="1" style={ms(INTRO.explored(d))} />
      ))}
      {v.walls.map(([x, y, w, h], i) => (
        <rect key={'w' + i} className="logo__wall" x={x} y={y} width={w} height={h} style={ms(INTRO.wall(i))} />
      ))}
      {v.path.map(([x, y], i) => (
        <rect key={'p' + i} className="logo__path" x={x} y={y} width="1" height="1" style={{ ...ms(INTRO.path(i)), '--i': i }} />
      ))}
      <rect className="logo__node" x={v.start[0]} y={v.start[1]} width={v.start[2]} height={v.start[3]} style={ms(INTRO.start)} />
      <rect className="logo__node" x={v.goal[0]} y={v.goal[1]} width={v.goal[2]} height={v.goal[3]} style={ms(INTRO.end(v))} />
    </svg>
  );
}
