/**
 * frontend/src/components/intro/PathfindingField.jsx
 *
 * The intro screen's dot grid as a live pathfinding grid (design/intro-reference.html,
 * section 4). BFS floods from just under the logo to the cursor through hidden
 * random walls (14%, seeded so the maze is stable), then the route lights up.
 * Touch devices auto-target a random cell every 2.6s.
 *
 * Differences from the reference are performance/lifecycle only:
 * - the rAF loop runs only while something is visible, and stops when idle
 * - paused while the tab is hidden
 * - fully torn down on unmount (i.e. once the user is logged in)
 * - never started under prefers-reduced-motion
 *
 * Imperative handle: pulse() (goal-lit ripple), implode(dur) (entry transition:
 * reverse BFS, a ring contracting from the screen edges into the logo), clear().
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const G = 28;
const SQ = 8;

function rng(seed) {
  return () => ((seed = Math.imul(seed ^ (seed >>> 15), seed | 1) + 0x6d2b79f5 | 0) >>> 0) / 4294967296;
}

const PathfindingField = forwardRef(function PathfindingField({ sourceRef }, ref) {
  const canvasRef = useRef(null);
  const apiRef = useRef(null);

  useImperativeHandle(ref, () => ({
    pulse: () => apiRef.current?.pulse(),
    implode: (dur) => apiRef.current?.implode(dur),
    clear: () => apiRef.current?.clear(),
  }), []);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const cv = canvasRef.current;
    const ctx = cv.getContext('2d');
    let cols, rows, walls, src = [0, 0];
    let anim = null;
    let raf = 0;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(innerWidth / G) + 1; rows = Math.ceil(innerHeight / G) + 1;
      const r = rng(7); walls = new Uint8Array(cols * rows); for (let i = 0; i < walls.length; i++) walls[i] = r() < 0.14 ? 1 : 0;
      const b = sourceRef.current?.getBoundingClientRect() ?? { left: innerWidth / 2, width: 0, bottom: innerHeight / 3 };
      src = [Math.round((b.left + b.width / 2) / G), Math.min(rows - 1, Math.round(b.bottom / G) + 1)];
      walls[src[1] * cols + src[0]] = 0;
      anim = null; ctx.clearRect(0, 0, innerWidth, innerHeight);
    }

    function bfs(from, to) {
      const n = cols * rows, dist = new Int16Array(n).fill(-1), par = new Int32Array(n).fill(-1), q = new Int32Array(n);
      let h = 0, t = 0; const s0 = from[1] * cols + from[0]; dist[s0] = 0; q[t++] = s0; const order = [];
      const goal = to ? to[1] * cols + to[0] : -1; if (goal >= 0) walls[goal] = 0;
      while (h < t) {
        const c = q[h++]; order.push(c); if (c === goal) break;
        const x = c % cols, y = c / cols | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const k = ny * cols + nx; if (dist[k] >= 0 || walls[k]) continue; dist[k] = dist[c] + 1; par[k] = c; q[t++] = k;
        }
      }
      const path = []; if (goal >= 0 && dist[goal] >= 0) { let c = goal; while (c >= 0) { path.push(c); c = par[c]; } path.reverse(); }
      let maxD = 0; for (const c of order) if (dist[c] > maxD) maxD = dist[c];
      return { dist, order, path, maxD: goal >= 0 && dist[goal] >= 0 ? dist[goal] : maxD };
    }

    function solve(tx, ty, opts = {}) {
      const to = [Math.max(0, Math.min(cols - 1, Math.round(tx / G))), Math.max(0, Math.min(rows - 1, Math.round(ty / G)))];
      if (anim && anim.to + '' === to + '' && !opts.force) return;
      const r = bfs(src, opts.full ? null : to);
      anim = { ...r, to, t0: performance.now(), speed: opts.speed || 0.05, full: !!opts.full, alpha: opts.alpha || 0.16 };
      start();
    }

    // Same drawing as the reference; returns whether anything is still visible
    // so the loop can stop itself when a solve has fully faded out.
    function draw(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (!anim) return false;
      if (anim.implode) {
        const e = now - anim.t0, r = anim.maxD * (1 - Math.min(1, e / anim.dur));
        for (const c of anim.order) {
          const d = anim.dist[c]; const band = d - r; if (band < 0 || band > 5) continue;
          const a = 0.6 * (1 - band / 5); ctx.fillStyle = `rgba(255,44,143,${a})`; ctx.fillRect((c % cols) * G - SQ / 2, (c / cols | 0) * G - SQ / 2, SQ, SQ);
        }
        if (e > anim.dur) anim = null; // next frame clears, then the loop stops
        return true;
      }
      let alive = anim.full;
      const e = now - anim.t0, r = e * anim.speed;
      if (r < anim.maxD + 22) alive = true;
      for (const c of anim.order) {
        const d = anim.dist[c]; if (d > r) break;
        const age = r - d, a = anim.full ? Math.min(0.5, anim.alpha + age * 0.01) : anim.alpha * Math.max(0, 1 - age / 22); if (a <= 0.004) continue;
        ctx.fillStyle = `rgba(255,44,143,${a})`; const x = (c % cols) * G, y = (c / cols | 0) * G; ctx.fillRect(x - SQ / 2, y - SQ / 2, SQ, SQ);
      }
      if (anim.path.length && r >= anim.maxD) {
        const pe = (r - anim.maxD) / anim.speed, a = Math.max(0, 0.8 - Math.max(0, pe - 900) / 1400);
        if (a > 0) {
          alive = true;
          const shown = Math.min(anim.path.length, Math.floor(pe / 14) + 1);
          ctx.fillStyle = `rgba(255,44,143,${a})`; ctx.shadowColor = 'rgba(255,44,143,.8)'; ctx.shadowBlur = 8;
          for (let i = 0; i < shown; i++) { const c = anim.path[i]; ctx.fillRect((c % cols) * G - 5, (c / cols | 0) * G - 5, 10, 10); }
          ctx.shadowBlur = 0;
          const g = anim.path[anim.path.length - 1]; ctx.strokeStyle = `rgba(242,237,240,${a})`; ctx.lineWidth = 1.5; ctx.strokeRect((g % cols) * G - 8, (g / cols | 0) * G - 8, 16, 16);
        }
      }
      return alive;
    }

    const frame = (now) => { raf = draw(now) ? requestAnimationFrame(frame) : 0; };
    function start() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    resize();
    let last = 0;
    const onMove = (e) => { if (e.pointerType !== 'mouse') return; const n = performance.now(); if (n - last < 90) return; last = n; solve(e.clientX, e.clientY); };
    const onVisibility = () => (document.hidden ? stop() : anim && start());
    addEventListener('resize', resize);
    addEventListener('pointermove', onMove);
    document.addEventListener('visibilitychange', onVisibility);
    const coarse = matchMedia('(pointer: coarse)').matches;
    const auto = coarse ? setInterval(() => { if (!document.hidden && (!anim || !anim.full)) solve(Math.random() * innerWidth, Math.random() * innerHeight, { force: true }); }, 2600) : 0;

    apiRef.current = {
      pulse() { const b = sourceRef.current?.getBoundingClientRect(); if (b) solve(b.left + b.width / 2 + G * 9, b.bottom + G * 4, { force: true, speed: 0.035 }); },
      implode(dur) { const r = bfs(src, null); anim = { ...r, implode: true, dur, t0: performance.now() }; start(); },
      clear() { anim = null; stop(); ctx.clearRect(0, 0, innerWidth, innerHeight); },
    };

    return () => {
      stop(); clearInterval(auto); apiRef.current = null;
      removeEventListener('resize', resize);
      removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sourceRef]);

  return <canvas ref={canvasRef} className="ix-field" aria-hidden="true" />;
});

export default PathfindingField;
