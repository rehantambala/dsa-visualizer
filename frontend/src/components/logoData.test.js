import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLEAN, EXPLORED, TILE, INTRO, tileSvg } from "./logoData.js";

describe("logoData", () => {
  it("public/logo.svg is generated from the shared data (run `pnpm icons` if this fails)", () => {
    const onDisk = readFileSync(new URL("../../public/logo.svg", import.meta.url), "utf8");
    expect(onDisk).toBe(tileSvg());
  });

  it("paths are symmetric V shapes inside their grids", () => {
    for (const v of [CLEAN, EXPLORED]) {
      const n = v.path.length;
      v.path.forEach(([x, y], i) => {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(v.size);
        expect(v.path[n - 1 - i]).toEqual([v.size - 1 - x, y]);
      });
    }
  });

  it("explored matches the reference geometry and timeline", () => {
    expect(EXPLORED.path).toHaveLength(36);
    expect(EXPLORED.start).toEqual([2, 0, 3, 3]);
    expect(EXPLORED.goal).toEqual([19, 0, 3, 3]);
    expect(INTRO.end(EXPLORED)).toBe(1500 + 36 * 38);
    // explored cells never sit on a wall or the path
    const path = new Set(EXPLORED.path.map((p) => p + ""));
    for (const [x, y] of EXPLORED.explored) expect(path.has([x, y] + "")).toBe(false);
  });

  it("tile insets the clean 16x16 mark by 1 in an 18x18 frame", () => {
    expect(TILE.size).toBe(CLEAN.size + 2);
  });
});
