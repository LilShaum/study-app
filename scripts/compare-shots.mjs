/**
 * How much did a change visibly change? Compares two folders of screenshots
 * from scripts/screenshots.mjs (before = main, after = the branch) and says,
 * screen by screen, how much of it a person would see differ.
 *
 *   node scripts/compare-shots.mjs <beforeDir> <afterDir> [outDir]
 *
 * Writes <outDir>/compare.html: every screen before and after side by side,
 * at the size a person sees it, sorted by how much changed, with the changed
 * areas outlined. Prints a table to the terminal.
 *
 * Why: the owner asks for big changes to how the app works and feels, and
 * kept getting changes "a user would barely notice" (2026-11-27). A diff of
 * the code says nothing about that; this does. It is the evidence step of the
 * scope-check skill (.claude/skills/scope-check). The measure is deliberately
 * coarse: both shots are shrunk to a 120px-wide grid, so antialiasing, a moved
 * pixel or a recoloured hairline does not count, and a new layout, a new
 * control or a different hierarchy does.
 *
 *   untouched  < 3% of the screen differs
 *   touched    3-20%: a person comparing side by side sees it
 *   reworked   > 20%: a person sees it at a glance, without the old one beside it
 *
 * Needs playwright (the session-start hook installs it).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [beforeArg, afterArg, outArg] = process.argv.slice(2);
if (!beforeArg || !afterArg) {
  console.error('usage: node scripts/compare-shots.mjs <beforeDir> <afterDir> [outDir]');
  process.exit(1);
}
const BEFORE = path.resolve(beforeArg);
const AFTER = path.resolve(afterArg);
const OUT = path.resolve(outArg ?? path.join(AFTER, '..', 'compare'));
fs.mkdirSync(OUT, { recursive: true });

const pngs = (dir) => new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.png')));
const before = pngs(BEFORE);
const after = pngs(AFTER);
const names = [...new Set([...before, ...after])].sort();

const dataUrl = (file) => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

// The image's Chromium, if the installed playwright wants another build.
const browser = await chromium.launch().catch(() =>
  chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

/** Runs in the page: shrinks both images to a coarse grid and compares cells. */
async function measure(a, b) {
  return page.evaluate(async ([srcA, srcB]) => {
    const load = (src) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
    const [ia, ib] = await Promise.all([load(srcA), load(srcB)]);
    const W = 120;
    const ha = Math.round((ia.height / ia.width) * W);
    const hb = Math.round((ib.height / ib.width) * W);
    const H = Math.max(ha, hb);
    const grid = (img, h) => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#f0f'; // beyond the shorter shot counts as changed
      g.fillRect(0, 0, W, H);
      g.drawImage(img, 0, 0, W, h);
      return g.getImageData(0, 0, W, H).data;
    };
    const da = grid(ia, ha);
    const db = grid(ib, hb);
    const changed = [];
    let n = 0;
    for (let i = 0; i < W * H; i++) {
      const o = i * 4;
      const d = Math.abs(da[o] - db[o]) + Math.abs(da[o + 1] - db[o + 1]) + Math.abs(da[o + 2] - db[o + 2]);
      const hit = d > 60;
      changed.push(hit ? 1 : 0);
      if (hit) n++;
    }
    return { share: n / (W * H), W, H, changed, heightBefore: ia.height, heightAfter: ib.height };
  }, [a, b]);
}

const rows = [];
for (const name of names) {
  if (!before.has(name)) { rows.push({ name, share: 1, verdict: 'new screen' }); continue; }
  if (!after.has(name)) { rows.push({ name, share: 1, verdict: 'gone' }); continue; }
  const m = await measure(dataUrl(path.join(BEFORE, name)), dataUrl(path.join(AFTER, name)));
  const verdict = m.share < 0.03 ? 'untouched' : m.share <= 0.2 ? 'touched' : 'reworked';
  rows.push({ name, ...m, verdict });
}
await browser.close();

rows.sort((x, y) => y.share - x.share);

// Changed cells as an SVG overlay on the after shot, so the eye goes to them.
const overlay = (r) => {
  if (!r.changed) return '';
  const rects = [];
  for (let y = 0; y < r.H; y++) {
    for (let x = 0; x < r.W; x++) {
      if (r.changed[y * r.W + x]) rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  return `<svg class="ov" viewBox="0 0 ${r.W} ${r.H}" preserveAspectRatio="none">${rects.join('')}</svg>`;
};

const rel = (dir, name) => path.relative(OUT, path.join(dir, name)).split(path.sep).join('/');
const pct = (s) => `${Math.round(s * 100)}%`;
const counts = rows.reduce((acc, r) => ({ ...acc, [r.verdict]: (acc[r.verdict] ?? 0) + 1 }), {});

const html = `<!doctype html><meta charset="utf-8"><title>Before and after</title>
<style>
body{font:15px/1.4 system-ui,sans-serif;margin:16px;background:#fafaf7;color:#222}
h1{font-size:20px}.sum{margin-bottom:24px}
section{margin:0 0 40px;border-top:1px solid #ccc;padding-top:12px}
h2{font-size:16px;margin:0 0 8px}.v{font-weight:600}
.reworked .v{color:#1a7f37}.touched .v{color:#9a6700}.untouched .v{color:#cf222e}
.pair{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
figure{margin:0;position:relative;max-width:min(48%,420px)}
figure img{width:100%;display:block;border:1px solid #ddd}
figcaption{font-size:13px;color:#666}
.ov{position:absolute;left:0;top:0;width:100%;height:100%;fill:rgba(255,0,170,.28);pointer-events:none}
</style>
<h1>Before and after, by how much a person would see change</h1>
<p class="sum">${rows.length} screens: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}.
Shown at the width a person sees them, not zoomed. Pink marks what changed.</p>
${rows.map((r) => `<section class="${r.verdict.replace(' ', '-')}">
<h2>${r.name} <span class="v">${r.verdict}, ${pct(r.share)}</span></h2>
<div class="pair">
${before.has(r.name) ? `<figure><img src="${rel(BEFORE, r.name)}"><figcaption>before</figcaption></figure>` : ''}
${after.has(r.name) ? `<figure><img src="${rel(AFTER, r.name)}">${overlay(r)}<figcaption>after</figcaption></figure>` : ''}
</div></section>`).join('\n')}`;

fs.writeFileSync(path.join(OUT, 'compare.html'), html);

console.log('screen'.padEnd(48), 'changed', 'verdict');
for (const r of rows) console.log(r.name.padEnd(48), pct(r.share).padStart(7), r.verdict);
console.log(`\n${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);
console.log(`Side by side: ${path.join(OUT, 'compare.html')}`);
