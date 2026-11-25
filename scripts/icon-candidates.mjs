/**
 * Icon candidates for docs/proposals/icon.md, drawn so the owner can pick.
 *
 *   node scripts/icon-candidates.mjs <outDir>
 *
 * Writes tree-solid-{paper,ink}.svg and sprig-{paper,ink}.svg (512 box).
 * Once a pick is made, its drawing moves into scripts/make-icons.mjs, which
 * writes the real icons and src/lib/sprigMark.ts, and this file goes.
 */
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const r = (n) => Math.round(n * 10) / 10, p = (q) => `${r(q[0])},${r(q[1])}`;
const PAPER = '#f4f0e6', INK = '#1d1c19';
function onC(P, t) { const u = 1 - t, c = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]; return [0, 1].map((i) => P.reduce((s, q, k) => s + q[i] * c[k], 0)); }
function tan(P, t) { const a = onC(P, Math.max(0, t - 0.01)), b = onC(P, Math.min(1, t + 0.01)); return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; }
function leaf([x, y], a, L, w, lean = 0.12) {
  const t = (a * Math.PI) / 180, dx = Math.cos(t), dy = Math.sin(t), nx = -dy, ny = dx;
  const at = (s, k) => [x + dx * L * s + nx * w * k, y + dy * L * s + ny * w * k];
  return { o: `M${p([x, y])}C${p(at(0.22, 1.25 + lean))} ${p(at(0.72, 0.95))} ${p(at(1, 0))}C${p(at(0.68, -1.05 + lean))} ${p(at(0.25, -1.1))} ${p([x, y])}`,
           rib: `M${p(at(0.12, 0))}Q${p(at(0.5, 0.1))} ${p(at(0.84, 0))}` };
}
const tile = (bg) => `<path d="M112,0H400C470,0 512,42 512,112V400C512,470 470,512 400,512H112C42,512 0,470 0,400V112C0,42 42,0 112,0Z" fill="${bg}"/>`;
// Branches: [cubic, width, side] side L = bare, R = in leaf.
const B = [
  [[[252, 306], [226, 286], [196, 268], [170, 232]], 15, 'L'],
  [[[170, 232], [160, 216], [152, 198], [146, 176]], 10, 'L'],
  [[[268, 306], [296, 284], [324, 266], [348, 232]], 15, 'R'],
  [[[348, 232], [360, 214], [368, 196], [372, 172]], 10, 'R'],
  [[[260, 302], [254, 262], [264, 228], [258, 192]], 14, 'C'],
  [[[258, 192], [254, 166], [258, 142], [266, 112]], 10, 'R'],
  [[[190, 258], [166, 252], [140, 258], [114, 272]], 9, 'L'],
  [[[160, 214], [140, 204], [124, 186], [116, 164]], 7, 'L'],
  [[[256, 212], [236, 198], [222, 178], [214, 152]], 9, 'L'],
  [[[214, 152], [208, 140], [206, 128], [208, 114]], 6, 'L'],
  [[[114, 272], [102, 276], [94, 284], [88, 294]], 6, 'L'],
  [[[334, 252], [358, 250], [384, 258], [406, 274]], 9, 'R'],
  [[[360, 210], [380, 198], [394, 180], [400, 156]], 8, 'R'],
  [[[262, 166], [282, 152], [298, 134], [306, 110]], 8, 'R'],
];
function taper(P, w0, w1) {
  const L = [], R = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, q = onC(P, t), a = tan(P, t) * Math.PI / 180, w = (w0 + (w1 - w0) * t) / 2;
    L.push([q[0] - Math.sin(a) * w, q[1] + Math.cos(a) * w]); R.push([q[0] + Math.sin(a) * w, q[1] - Math.cos(a) * w]);
  }
  return 'M' + L.map(p).join('L') + 'L' + R.reverse().map(p).join('L') + 'Z';
}
function tree(bg, ink, solid) {
  const g = [];
  g.push(`<path d="M92,428C186,421 326,425 420,419" stroke-width="9"/>`);
  g.push(`<path d="M224,426C238,412 242,382 241,354C240,332 246,314 252,302L270,302C273,318 274,336 273,356C272,386 278,410 296,426Z" fill="${ink}" stroke-width="5"/>`);
  for (const [P, w] of B) g.push(`<path d="${taper(P, w * 1.25, w * 0.55)}" fill="${ink}" stroke-width="3"/>`);
  const leaves = [];
  let k = 0;
  for (const [P, w, side] of B) {
    if (side !== 'R') continue;
    const ts = w >= 14 ? [0.6] : w === 10 && P[0][0] === 258 ? [0.55, 1] : [0.45, 1];
    for (const t of ts) {
      const a = tan(P, t), s = t === 1 ? 0 : (k % 2 ? 48 : -48);
      leaves.push(leaf(onC(P, t), a + s, 50 + (k * 7) % 14, 18, k % 2 ? 0.15 : -0.05)); k++;
    }
  }
  leaves.push(leaf([150, 336], 118, 50, 18, 0.1));
  leaves.push(leaf([118, 418], -8, 48, 15, 0.2));
  const fill = solid ? ink : bg;
  for (const l of leaves) g.push(`<path d="${l.o}" fill="${fill}" stroke-width="8"/>` + (solid ? `<path d="${l.rib}" stroke="${bg}" stroke-width="4"/>` : ''));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${tile(bg)}<g transform="translate(256 262) scale(1.1) translate(-256 -270)" fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">${g.join('')}</g></svg>`;
}
for (const solid of [false, true]) {
  fs.writeFileSync(`${OUT}/tree-${solid ? 'solid' : 'open'}-paper.svg`, tree(PAPER, INK, solid));
  fs.writeFileSync(`${OUT}/tree-${solid ? 'solid' : 'open'}-ink.svg`, tree(INK, PAPER, solid));
}

// The sprig, redrawn: the old icon's idea with solid leaves.
function sprig(bg, ink) {
  const stem = [[206, 440], [188, 356], [238, 262], [306, 140]];
  const g = [`<path d="M${p(stem[0])}C${p(stem[1])} ${p(stem[2])} ${p(stem[3])}" stroke-width="16"/>`];
  const spots = [[0.16, 196, 130], [0.32, -22, 138], [0.5, 192, 132], [0.66, -36, 124], [0.82, 200, 104], [1, -64, 96]];
  spots.forEach(([t, a, L], i) => { const l = leaf(onC(stem, t), a, L, L * 0.34, i % 2 ? 0.15 : -0.05); g.push(`<path d="${l.o}" fill="${ink}" stroke-width="12"/><path d="${l.rib}" stroke="${bg}" stroke-width="6"/>`); });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${tile(bg)}<g fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">${g.join('')}</g></svg>`;
}
fs.writeFileSync(`${OUT}/sprig-paper.svg`, sprig(PAPER, INK));
fs.writeFileSync(`${OUT}/sprig-ink.svg`, sprig(INK, PAPER));
