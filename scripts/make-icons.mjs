/**
 * Draws the app icon and writes public/icons/* and the header mark's path data
 * (src/lib/sprigMark.ts).
 *
 *   node scripts/make-icons.mjs
 *
 * The mark is a sprig: one curved stem and six solid ink leaves, each with a
 * thin paper-coloured midrib, on a rounded paper tile. Leaves alternate sides
 * at uneven intervals and shorten towards the tip, which keeps it from
 * looking stamped out.
 *
 * Why solid: the earlier sprig drew four leaves in outline, and thin outlines
 * went faint at small sizes (a browser tab, a home screen). Solid leaves hold
 * at 16px. Owner's pick, 2026-11-25 (docs/proposals/icon.md).
 *
 * It is NOT the course tree itself: the generated tree is several hundred
 * leaves and collapses into a smudge below about 64px.
 *
 * The tile keeps its own light paper background in both themes, because a
 * home-screen or tab icon is composited by the OS and cannot follow one.
 * The header mark (src/components/Sprig.tsx) uses the same path data, so the
 * app icon, the tab and the header are one drawing rather than three that
 * drift apart.
 *
 * PNG rasterisation needs playwright's chromium; without it the script still
 * writes the SVGs and tells you which PNGs to render by other means.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'icons');

const PAPER = '#f4f0e6';
const INK = '#1d1c19';

const r = (n) => Math.round(n * 10) / 10;
const p = (q) => `${r(q[0])},${r(q[1])}`;

/** A point on a cubic, so every leaf is anchored exactly on the stem. */
function onCubic(P, t) {
  const u = 1 - t;
  const c = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1].map((i) => P.reduce((s, q, k) => s + q[i] * c[k], 0));
}

/** One leaf, anchored at its base, plus its midrib. */
function leaf([x, y], a, L, w, lean = 0.12) {
  const t = (a * Math.PI) / 180;
  const dx = Math.cos(t);
  const dy = Math.sin(t);
  const nx = -dy;
  const ny = dx;
  const at = (s, k) => [x + dx * L * s + nx * w * k, y + dy * L * s + ny * w * k];
  return {
    o:
      `M${p([x, y])}C${p(at(0.22, 1.25 + lean))} ${p(at(0.72, 0.95))} ${p(at(1, 0))}` +
      `C${p(at(0.68, -1.05 + lean))} ${p(at(0.25, -1.1))} ${p([x, y])}`,
    rib: `M${p(at(0.12, 0))}Q${p(at(0.5, 0.1))} ${p(at(0.84, 0))}`,
  };
}

const STEM = [[206, 440], [188, 356], [238, 262], [306, 140]];
const STEM_W = 16;
const LEAF_W = 12;
const RIB_W = 6;
// [position on stem, angle, length]
const SPOTS = [[0.16, 196, 130], [0.32, -22, 138], [0.5, 192, 132], [0.66, -36, 124], [0.82, 200, 104], [1, -64, 96]];

const stem = `M${p(STEM[0])}C${p(STEM[1])} ${p(STEM[2])} ${p(STEM[3])}`;
const leaves = SPOTS.map(([t, a, L], i) => leaf(onCubic(STEM, t), a, L, L * 0.34, i % 2 ? 0.15 : -0.05));

/** Sample the drawing (stroke included) to find its box, for centring and fitting. */
function bounds() {
  const pts = [];
  for (let i = 0; i <= 40; i++) pts.push(onCubic(STEM, i / 40));
  for (const { o } of leaves) {
    const n = o.match(/-?\d+(\.\d+)?/g).map(Number);
    const cs = [[n.slice(0, 2), n.slice(2, 4), n.slice(4, 6), n.slice(6, 8)], [n.slice(6, 8), n.slice(8, 10), n.slice(10, 12), n.slice(12, 14)]];
    for (const c of cs) for (let i = 0; i <= 40; i++) pts.push(onCubic(c, i / 40));
  }
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const pad = LEAF_W / 2;
  const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
  const cx = (box[0] + box[2]) / 2;
  const cy = (box[1] + box[3]) / 2;
  return { box, cx, cy, radius: Math.max(...pts.map((q) => Math.hypot(q[0] - cx, q[1] - cy))) + pad };
}
const B = bounds();

/** The drawing, optionally moved to the middle of the 512 box and scaled about it. */
function sprig({ bg = PAPER, ink = INK, ribs = true, scale = 1, centre = false } = {}) {
  const g = [`<path d="${stem}" stroke-width="${STEM_W}"/>`];
  for (const l of leaves) {
    g.push(`<path d="${l.o}" fill="${ink}" stroke-width="${LEAF_W}"/>`);
    if (ribs) g.push(`<path d="${l.rib}" stroke="${bg}" stroke-width="${RIB_W}"/>`);
  }
  const body = `<g fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">${g.join('')}</g>`;
  if (scale === 1 && !centre) return body;
  const [ox, oy] = centre ? [B.cx, B.cy] : [256, 256];
  return `<g transform="translate(256 256) scale(${r(scale * 1000) / 1000}) translate(${-r(ox)} ${-r(oy)})">${body}</g>`;
}

const ROUND = `<path d="M112,0H400C470,0 512,42 512,112V400C512,470 470,512 400,512H112C42,512 0,470 0,400V112C0,42 42,0 112,0Z" fill="${PAPER}"/>`;
const SQUARE = `<rect width="512" height="512" fill="${PAPER}"/>`;
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${inner}</svg>`;

const TILE = svg(ROUND + sprig());
// Maskable art is cropped to a circle by some launchers: centre the drawing
// and fit it inside the central 80% (radius 0.4 of the box).
const MASKABLE = svg(SQUARE + sprig({ centre: true, scale: (512 * 0.4) / B.radius }));
// iOS rounds it itself and ignores transparency: full bleed, a little smaller than the tile.
const APPLE = svg(SQUARE + sprig({ scale: 0.9 }));
// Android's notification badge is a white silhouette on transparent.
const BADGE = svg(sprig({ bg: '#ffffff', ink: '#ffffff', ribs: false, centre: true, scale: (512 * 0.44) / B.radius }));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'icon.svg'), TILE + '\n');

fs.writeFileSync(
  path.join(ROOT, 'src', 'lib', 'sprigMark.ts'),
  `/**
 * The sprig, as path data in a 0 0 512 512 viewBox.
 *
 * GENERATED by scripts/make-icons.mjs, edit the geometry there, not here,
 * or the header mark and the app icon stop being the same drawing.
 */
export const SPRIG_VIEWBOX = '0 0 512 512';
export const SPRIG_STROKE_WIDTH = ${STEM_W};
export const SPRIG_LEAF_STROKE_WIDTH = ${LEAF_W};
export const SPRIG_RIB_STROKE_WIDTH = ${RIB_W};
export const SPRIG_STEM = '${stem}';
export const SPRIG_LEAVES = [
${leaves.map((l) => `  '${l.o}',`).join('\n')}
];
export const SPRIG_RIBS = [
${leaves.map((l) => `  '${l.rib}',`).join('\n')}
];
`,
);

const PNGS = [
  ['icon-192.png', TILE, 192, true],
  ['icon-512.png', TILE, 512, true],
  ['icon-maskable-512.png', MASKABLE, 512, false],
  ['apple-touch-icon.png', APPLE, 180, false],
  ['badge-96.png', BADGE, 96, true],
];

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('icon.svg written. playwright not found, render these from it by hand:');
  for (const [name, , size] of PNGS) console.log(`  ${name} (${size}px)`);
  process.exit(0);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
for (const [name, markup, size, transparent] of PNGS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0;padding:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${markup}`);
  await page.screenshot({ path: path.join(OUT, name), omitBackground: transparent });
  await page.close();
  console.log(`wrote ${name}`);
}
await browser.close();
console.log('wrote icon.svg and src/lib/sprigMark.ts');
