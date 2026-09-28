/**
 * frontend/scripts/build-icons.mjs  (pnpm icons)
 *
 * Regenerates public/logo.svg (favicon) and public/apple-touch-icon.png
 * (180x180) from src/components/logoData.js, so the icons can't drift from
 * the in-app logo. The PNG is rendered with Playwright at an exact 10x scale.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { tileSvg, TILE } from "../src/components/logoData.js";

const svg = tileSvg();
writeFileSync(new URL("../public/logo.svg", import.meta.url), svg);

const px = 180;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: px, height: px } });
await page.setContent(
  `<style>html,body{margin:0;background:${TILE.bg}}img{display:block;width:${px}px;height:${px}px;image-rendering:pixelated}</style>` +
    `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}">`
);
await page.screenshot({ path: fileURLToPath(new URL("../public/apple-touch-icon.png", import.meta.url)) });
await browser.close();
console.log("wrote public/logo.svg, public/apple-touch-icon.png");
