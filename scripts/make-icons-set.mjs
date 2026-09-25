/**
 * Draws the icon set and writes src/components/iconPaths.ts.
 *
 *   node scripts/make-icons-set.mjs [--sheet out.html]
 *
 * CONSTRUCTION CONTRACT — the same one src/lib/growTree.ts holds to, because
 * an app whose illustration is drawn by one hand and whose icons are drawn by
 * another reads as an app with artwork pasted into it.
 *
 *   1. No primitives. No <circle>, <rect>, <line>, <polyline> or <polygon>
 *      anywhere in the output: every mark is a path of placed curves. A
 *      perfect circle is the clip-art tell, and the set this replaced was
 *      built из them.
 *   2. No mirror symmetry. Rings are out of round, rays differ in length,
 *      the two halves of a shape are never each other's reflection.
 *   3. Two weights, not one. The outer contour of a glyph is heavier than
 *      the marks inside it, which is what makes a flat drawing sit in front
 *      of itself. (The tree uses three; at 16px a third is mud.)
 *   4. currentColor, stroke-only, so a glyph belongs to whatever theme it is
 *      rendered in.
 *   5. Deterministic. The jitter is seeded, so the same glyph is the same
 *      glyph on every build.
 *
 * Everything is authored in a 24-unit box.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const r1 = (n) => Math.round(n * 10) / 10;

/** Deterministic per-glyph jitter. */
function rng(seed) {
  let h = 2166136261 >>> 0;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const K = 0.5523; // circle-to-bezier constant

/**
 * A ring that is out of round: each quadrant gets its own radius and its own
 * handle length, so it reads as drawn rather than as <circle>.
 */
function ring(cx, cy, r, seed, wobble = 0.07) {
  const rand = rng(seed);
  const rs = [0, 1, 2, 3].map(() => r * (1 + (rand() - 0.5) * 2 * wobble));
  const pts = [
    [cx, cy - rs[0]],
    [cx + rs[1], cy],
    [cx, cy + rs[2]],
    [cx - rs[3], cy],
  ];
  const h = [0, 1, 2, 3].map(() => K * (1 + (rand() - 0.5) * 0.25));
  const seg = (i) => {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const ra = rs[i];
    const rb = rs[(i + 1) % 4];
    const dirs = [
      [[ra * h[i], 0], [0, -rb * h[i]]],
      [[0, rb * h[i]], [ra * h[i], 0]],
      [[-ra * h[i], 0], [0, rb * h[i]]],
      [[0, -rb * h[i]], [-ra * h[i], 0]],
    ][i];
    const c1 = [a[0] + dirs[0][0], a[1] + dirs[0][1]];
    const c2 = [b[0] + dirs[1][0], b[1] + dirs[1][1]];
    return `C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(b[0])},${r1(b[1])}`;
  };
  return `M${r1(pts[0][0])},${r1(pts[0][1])}${seg(0)}${seg(1)}${seg(2)}${seg(3)}Z`;
}

/** An open arc of a wobbly ring, from angle a0 to a1 (degrees, clockwise from 12). */
function arc(cx, cy, r, a0, a1, seed) {
  const rand = rng(seed);
  const steps = Math.max(2, Math.round(Math.abs(a1 - a0) / 45));
  const pt = (t) => {
    const a = ((a0 + (a1 - a0) * t - 90) * Math.PI) / 180;
    const rr = r * (1 + (rand() - 0.5) * 0.1);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  };
  const pts = Array.from({ length: steps + 1 }, (_, i) => pt(i / steps));
  return smooth(pts);
}

/** Catmull-Rom through the points, emitted as cubics. */
function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(p2[0])},${r1(p2[1])}`;
  }
  return d;
}

/**
 * An arrowhead sitting ON an arc, pointing the way the arc travels.
 *
 * Derived from the same centre, radius and angle the arc is drawn from,
 * because the first version was placed by eye: its barbs splayed away from
 * the direction of travel instead of trailing it, and the glyph read as a
 * long curved Y rather than as an arrow.
 */
function arcHead(cx, cy, r, angle, { len = 3.6, spread = 42, reverse = false } = {}) {
  const a = ((angle - 90) * Math.PI) / 180;
  const tip = [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  // Tangent for increasing angle; reversed when the arrow runs the other way.
  const t = reverse ? [Math.sin(a), -Math.cos(a)] : [-Math.sin(a), Math.cos(a)];
  const barb = (deg) => {
    const rad = (deg * Math.PI) / 180;
    const bx = -t[0] * Math.cos(rad) + t[1] * Math.sin(rad);
    const by = -t[0] * Math.sin(rad) - t[1] * Math.cos(rad);
    return [r1(tip[0] + bx * len), r1(tip[1] + by * len)];
  };
  const [p1, p2] = [barb(spread), barb(-spread)];
  // A CLOSED triangle, filled.
  //
  // Four stroked versions of this head all read as a hook rather than an
  // arrow: with a round cap and join on a heavy stroke, one barb always lies
  // along the arc it terminates and the pair reads as a bend in the line. A
  // solid head cannot be misread, and the drawing already fills a shape where
  // one has to read as solid rather than as an outline — that is how the
  // tree's leaves work.
  return `M${r1(tip[0])},${r1(tip[1])}L${p1[0]},${p1[1]}L${p2[0]},${p2[1]}Z`;
}

/** A line with a slight bow in it, so no two strokes are mechanically parallel. */
function stroke(x1, y1, x2, y2, seed, bow = 0.35) {
  const rand = rng(seed);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const off = bow * (rand() - 0.3);
  return smooth([
    [x1, y1],
    [mx + (-dy / len) * off, my + (dx / len) * off],
    [x2, y2],
  ]);
}

/** A closed shape through the points, smoothed. */
function blob(pts) {
  return `${smooth([...pts, pts[0]])}Z`;
}

// `o` marks the outer contour (heavier); everything else is an inner mark.
const o = (d) => ({ d, w: 'o' });
// A solid mark: filled, unstroked. Only where a shape must read as solid.
const f = (d) => ({ d, w: 'f' });
const i = (d) => ({ d, w: 'i' });

const GLYPHS = {
  sun: [
    o(ring(12, 12, 4.4, 'sun')),
    ...[
      [12, 1.6, 12, 4.2], [12, 19.9, 12, 22.4], [1.7, 12, 4.3, 12], [19.8, 12, 22.3, 12],
      [4.9, 4.6, 6.7, 6.5], [17.4, 17.2, 19.2, 19.1], [4.7, 19.3, 6.6, 17.4], [17.3, 6.7, 19.1, 4.8],
    ].map(([a, b, c, dd], n) => i(stroke(a, b, c, dd, `sun-ray-${n}`, 0.18))),
  ],
  moon: [o(smooth([[20.6, 13.2], [18.2, 18.7], [12.4, 21], [6.6, 18.4], [4.2, 12.6], [6.9, 6.9], [11.7, 4.6], [10.4, 8.6], [11.2, 13.6], [15.3, 16], [20.6, 13.2]]))],
  bulb: [
    o(smooth([[9.4, 15.6], [7.1, 13], [6.9, 9.3], [9.4, 6.6], [13.1, 6.1], [16.2, 7.9], [17.1, 11.2], [15.8, 14.1], [14.4, 15.7]])),
    i(stroke(9.6, 18.2, 14.4, 17.9, 'bulb-a', 0.2)),
    i(stroke(10.2, 20.8, 13.9, 20.6, 'bulb-b', 0.2)),
  ],
  clipboard: [
    o(smooth([[9.2, 4.3], [6.4, 4.5], [5.4, 6.1], [5.3, 18.9], [6.3, 20.6], [17.8, 20.5], [18.7, 18.8], [18.6, 6], [17.5, 4.4], [14.8, 4.3]])),
    // The clip is drawn small and open: closed and filled at the heavier
    // weight it packed solid at 16px and the glyph grew a black cap.
    i(blob([[9.6, 3.1], [14.4, 3.3], [14.5, 5.4], [9.5, 5.3]])),
  ],
  // Books on a shelf, leaning: four uprights on a baseline was the same
  // drawing as bar-chart, and two glyphs in one set may not be the same
  // drawing.
  library: [
    o(blob([[4.2, 20.4], [4.5, 6.2], [7.5, 5.9], [7.4, 20.4]])),
    o(blob([[8.4, 20.4], [8.8, 8.4], [11.6, 8.2], [11.4, 20.4]])),
    o(smooth([[12.8, 20.3], [15.6, 7.1], [18.4, 7.8], [16.2, 20.4]])),
    i(stroke(3.3, 20.8, 20.6, 20.6, 'lib-shelf', 0.2)),
  ],
  search: [o(ring(10.8, 10.6, 6.3, 'search')), i(stroke(15.6, 15.4, 21, 20.9, 'search-tail', 0.2))],
  // Bars, not strokes: each has a width and a flat top, which is what tells
  // it apart from the books next to it in the set.
  'bar-chart': [
    o(blob([[4.4, 20.3], [4.6, 13.6], [8.1, 13.4], [8, 20.3]])),
    o(blob([[9.6, 20.3], [9.9, 5.8], [13.4, 6.1], [13.2, 20.3]])),
    o(blob([[14.8, 20.3], [15.1, 10.4], [18.6, 10.1], [18.4, 20.3]])),
    i(stroke(3.3, 20.7, 20.6, 20.5, 'bc-base', 0.2)),
  ],
  // A line over time, for the progress page. It used to borrow bar-chart,
  // which is Weakest first's glyph, so two neighbouring links on the course
  // page wore the same picture.
  trend: [
    o(smooth([[3.6, 17.2], [7.6, 12.6], [11, 14.6], [15.2, 8.8], [20.4, 5.6]])),
    i(stroke(3.3, 20.7, 20.6, 20.5, 'trend-base', 0.2)),
    i(smooth([[16.6, 4.7], [20.6, 5.4], [19.9, 9.3]])),
  ],
  // A figure: two parts in a frame and the relation between them. Diagrams
  // used the flashcards' stacked cards, so the link read as a second
  // Flashcards.
  diagram: [
    o(blob([[5.3, 3.7], [18.8, 3.5], [20.5, 5.2], [20.6, 18.7], [18.9, 20.5], [5.1, 20.4], [3.4, 18.8], [3.5, 5.4]])),
    i(ring(8.4, 15.4, 2.1, 'dg-a', 0.12)),
    i(ring(15.7, 8.7, 2.1, 'dg-b', 0.12)),
    i(stroke(9.9, 13.8, 14.2, 10.3, 'dg-link', 0.25)),
  ],
  // A question and one more: for asking the AI for more practice. It wore
  // Review's arrow before, which says "again", not "more".
  'question-plus': [
    o(smooth([[5.2, 9.1], [6.4, 5.9], [9.6, 4.6], [12.8, 5.9], [13.4, 9.1], [11.1, 11.6], [9.5, 13.7], [9.4, 15.6]])),
    i(stroke(9.3, 19.4, 9.6, 19.7, 'qp-dot', 0.05)),
    i(stroke(17.6, 11.8, 17.7, 20.2, 'qp-v', 0.2)),
    i(stroke(13.5, 16, 21.8, 16.1, 'qp-h', 0.2)),
  ],
  'book-open': [
    o(smooth([[12, 6.4], [8.7, 4.3], [3.4, 4.1], [3.2, 18.4], [8.4, 18.7], [12, 20.6]])),
    o(smooth([[12, 6.4], [15.4, 4.2], [20.7, 4.2], [20.8, 18.5], [15.5, 18.6], [12, 20.6]])),
    i(stroke(12, 6.6, 12, 20.3, 'book-spine', 0.2)),
  ],
  'help-circle': [
    o(ring(12, 12, 9.2, 'help')),
    i(smooth([[9.1, 9.3], [10.2, 7.2], [12.8, 7], [14.6, 8.5], [14.2, 10.6], [12.1, 12], [11.9, 14.2]])),
    i(stroke(11.8, 17, 12.1, 17.3, 'help-dot', 0.05)),
  ],
  // The help circle's own hand-drawn ring, with a lower-case i: stem
  // slightly off vertical, the dot a short stroke rather than a disc.
  info: [
    o(ring(12, 12, 9.2, 'help')),
    i(stroke(11.9, 10.6, 12.1, 16.9, 'info-stem', 0.2)),
    i(stroke(11.8, 7.4, 12.1, 7.7, 'help-dot', 0.05)),
  ],
  layers: [
    o(blob([[12, 3.1], [20.6, 8.2], [12.1, 13.3], [3.3, 8.3]])),
    i(smooth([[3.4, 12.6], [12, 17.6], [20.6, 12.4]])),
    i(smooth([[3.5, 16.6], [12.1, 21.4], [20.5, 16.4]])),
  ],
  'file-text': [
    o(smooth([[14.2, 2.4], [6.1, 2.5], [5.2, 4.2], [5.3, 19.8], [6.4, 21.5], [17.8, 21.4], [18.7, 19.7], [18.6, 7.1], [14.2, 2.4]])),
    i(smooth([[14.1, 2.5], [14, 6.7], [18.5, 7]])),
    i(stroke(8.4, 12.1, 15.3, 12.3, 'ft-1', 0.25)),
    i(stroke(8.5, 16, 15.2, 15.8, 'ft-2', 0.25)),
  ],
  shuffle: [
    o(smooth([[3.2, 6.4], [7.4, 6.6], [11.4, 11.9], [15.6, 17.5], [20.6, 17.6]])),
    o(smooth([[3.3, 17.6], [7.6, 17.4], [10.4, 14.2]])),
    o(smooth([[14.1, 9.4], [16.4, 6.6], [20.7, 6.5]])),
    i(smooth([[17.9, 3.6], [20.9, 6.5], [17.8, 9.4]])),
    i(smooth([[17.9, 14.7], [20.9, 17.6], [17.8, 20.5]])),
  ],
  // The head sits ON the end of the arc. Drawn from the arc's own start
  // angle rather than placed by eye, which left it floating above the gap
  // looking like a stray tick.
  repeat: [
    o(arc(12, 12, 8.2, 40, 306, 'repeat-arc')),
    // The head sits PAST the end of the arc, not on it. Placed at the arc's
    // own endpoint, one barb lay along the stroke it was terminating and the
    // pair read as a hook rather than an arrow.
    f(arcHead(12, 12, 8.2, 307, { len: 4.6, spread: 34, reverse: true })),
  ],
  target: [o(ring(12, 12, 9.1, 'target-a')), i(ring(12, 12, 5.2, 'target-b')), i(ring(12, 12, 1.5, 'target-c', 0.15))],
  // A tray, open at the top: two walls, a floor, and the lip stepping down
  // across the middle. The dome that used to sit over it made a handbag of
  // the whole glyph.
  inbox: [
    o(smooth([[3.1, 7.4], [3.3, 18.6], [4.9, 20.4], [19.2, 20.3], [20.8, 18.5], [20.6, 7.3]])),
    i(smooth([[3.2, 13.9], [8.3, 13.8], [9.6, 16.4], [14.6, 16.3], [15.7, 13.7], [20.7, 13.8]])),
    i(stroke(8.6, 4.2, 15.4, 4.1, 'inbox-slot', 0.2)),
  ],
  'check-circle': [o(arc(12, 12, 9.1, 30, 350, 'cc-arc')), i(smooth([[7.6, 12.2], [10.8, 15.4], [17.2, 7.9]]))],
  plus: [o(stroke(12, 4.6, 12, 19.4, 'plus-v', 0.22)), o(stroke(4.6, 12, 19.4, 12, 'plus-h', 0.22))],
  share: [
    o(ring(18, 5.6, 2.6, 'share-a', 0.12)),
    o(ring(6, 12.1, 2.6, 'share-b', 0.12)),
    o(ring(18, 18.5, 2.6, 'share-c', 0.12)),
    i(stroke(8.4, 10.8, 15.6, 6.9, 'share-1', 0.2)),
    i(stroke(8.4, 13.4, 15.6, 17.3, 'share-2', 0.2)),
  ],
  'more-vertical': [
    o(ring(12, 5.2, 1.4, 'mv-a', 0.16)),
    o(ring(12, 12, 1.4, 'mv-b', 0.16)),
    o(ring(12, 18.8, 1.4, 'mv-c', 0.16)),
  ],
  x: [o(stroke(5.6, 5.4, 18.4, 18.6, 'x-a', 0.3)), o(stroke(18.6, 5.6, 5.4, 18.4, 'x-b', 0.3))],
  edit: [
    o(smooth([[11.2, 4.2], [4.4, 4.4], [3.2, 6.1], [3.3, 19.6], [4.7, 21.4], [18.6, 21.3], [19.8, 19.6], [19.7, 12.8]])),
    o(smooth([[17.4, 2.7], [21.3, 6.2], [12.1, 15.1], [8.2, 16.1], [9.2, 12.2], [17.4, 2.7]])),
    i(stroke(15.6, 4.6, 19.3, 8.1, 'edit-nib', 0.15)),
  ],
  download: [
    o(smooth([[3.3, 15.1], [3.4, 19.4], [5, 20.8], [19.2, 20.7], [20.7, 19.2], [20.6, 15]])),
    i(stroke(12, 3.4, 12.2, 15.4, 'dl-shaft', 0.2)),
    i(smooth([[7.2, 10.4], [12.1, 15.6], [16.9, 10.2]])),
  ],
  upload: [
    o(smooth([[3.3, 15.1], [3.4, 19.4], [5, 20.8], [19.2, 20.7], [20.7, 19.2], [20.6, 15]])),
    i(stroke(12, 3.6, 12.2, 15.6, 'up-shaft', 0.2)),
    i(smooth([[7.2, 8.6], [12.1, 3.4], [16.9, 8.8]])),
  ],
  trash: [
    o(smooth([[5.6, 6.6], [6.6, 20.1], [8.1, 21.4], [16, 21.3], [17.4, 20], [18.3, 6.5]])),
    i(stroke(3.4, 6.5, 20.6, 6.4, 'trash-lid', 0.2)),
    i(smooth([[9.1, 6.4], [9.4, 3.3], [14.7, 3.2], [14.9, 6.5]])),
    i(stroke(10.2, 10.2, 10.5, 17.4, 'trash-1', 0.25)),
    i(stroke(13.8, 10.1, 13.5, 17.5, 'trash-2', 0.25)),
  ],
};

const WEIGHTS = { o: 1.75, i: 1.25 };

const paths = Object.fromEntries(
  Object.entries(GLYPHS).map(([name, marks]) => [
    name,
    marks
      .map((m) =>
        m.w === 'f'
          ? `<path d="${m.d}" fill="currentColor" stroke="none"/>`
          : `<path d="${m.d}" stroke-width="${WEIGHTS[m.w]}"/>`,
      )
      .join(''),
  ]),
);

if (process.argv.includes('--sheet')) {
  const out = process.argv[process.argv.indexOf('--sheet') + 1];
  const cell = (name) =>
    `<figure>${[40, 24, 20, 16]
      .map(
        (px) =>
          `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`,
      )
      .join('')}<figcaption>${name}</figcaption></figure>`;
  fs.writeFileSync(
    out,
    `<!doctype html><meta charset=utf8><style>
body{background:#e2e0d5;color:#1b1d1f;font:12px system-ui;margin:0;padding:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
figure{margin:0;display:flex;align-items:center;gap:10px}
figcaption{margin-left:6px;opacity:.7}</style>${Object.keys(paths).map(cell).join('')}`,
  );
  console.log(out);
} else {
  fs.writeFileSync(
    path.join(HERE, '..', 'src', 'components', 'iconPaths.ts'),
    `/**\n * The icon set, as inline SVG markup in a 0 0 24 24 viewBox.\n *\n * GENERATED by scripts/make-icons-set.mjs — edit the glyphs there, not here.\n * The construction contract, and why it matters, is at the top of that file.\n */\nexport const ICON_PATHS = {\n${Object.entries(
      paths,
    )
      .map(([k, v]) => `  '${k}':\n    '${v}',`)
      .join('\n')}\n} as const;\n\nexport type IconName = keyof typeof ICON_PATHS;\n`,
  );
  console.log('wrote src/components/iconPaths.ts');
}
