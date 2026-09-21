/**
 * Screenshots every route, in the states a real person meets.
 *
 *   npm run build && node scripts/screenshots.mjs [outDir]
 *
 * Two accounts, because the second finds more than the first: one populated
 * with a real course and partial progress, one brand new — no course, no
 * progress, onboarding never dismissed. Both at phone and desktop width, and
 * the course page in both themes.
 *
 * PHONE SHOTS EMULATE TOUCH MEDIA. Playwright's `isMobile`/`hasTouch` set the
 * viewport and the touch API but leave the `hover` and `pointer` media
 * features alone, so a phone screenshot taken without the CDP override below
 * renders the hover-only keyboard hints and skips every `(pointer: coarse)`
 * rule — including the 44px tap targets. The shots looked right and were
 * lying.
 *
 * Needs playwright on the path and a chromium; it is a local tool, not part
 * of the build, so neither is a dependency of the app.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, 'screenshots'));
const FIXTURE = path.join(ROOT, 'scripts', '__fixtures__', 'biochem.study.json');
const BASE = '/study-app/';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

/** Serves dist/ under the deployed base path, so asset URLs match production. */
function serve(dist) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(BASE, '/');
    let file = path.join(dist, rel);
    if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(dist, 'index.html');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const VIEWPORTS = {
  desktop: { width: 1280, height: 1000 },
  phone: { width: 390, height: 844 },
};

/**
 * Deterministic partial progress: the early sections worked through with
 * falling accuracy, the later ones untouched — so the tree carries leafed and
 * bare limbs at once and the progress page has a spread to rank.
 */
const SEED_PROGRESS = (id) => {
  const course = JSON.parse(localStorage.getItem('arborous:courses')).state.courses[id];
  const plan = [[1, 0.9], [0.9, 0.8], [0.75, 0.65], [0.5, 0.55], [0.3, 0.45], [0.15, 0.35]];
  const byCourse = { [id]: {} };
  course.sections.forEach((section, i) => {
    const spec = plan[i];
    if (!spec) return;
    const [share, accuracy] = spec;
    const gradable = section.items.filter((it) => it.type === 'mcq' || it.type === 'flashcard');
    gradable.slice(0, Math.round(gradable.length * share)).forEach((item, j) => {
      const right = (j % 5) / 5 < accuracy;
      byCourse[id][item.id] = { got: right ? 2 : 1, missed: right ? 0 : 2, lastSeen: Date.now() - 86400000 };
    });
  });
  localStorage.setItem('arborous:progress', JSON.stringify({ state: { byCourse }, version: 0 }));
};

async function page(browser, size, { onboarded = true } = {}) {
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[size],
    deviceScaleFactor: 2,
    hasTouch: size === 'phone',
    isMobile: size === 'phone',
  });
  const p = await ctx.newPage();
  if (size === 'phone') {
    const cdp = await ctx.newCDPSession(p);
    const touchMedia = () =>
      cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }],
      });
    await touchMedia();
    // Playwright re-sends its own emulation bundle on every navigation and
    // that clears ours, so the override goes back on after each one. The
    // first version set it once and every phone shot quietly rendered with
    // desktop media — hover-only UI visible, 44px targets not applied.
    p.on('framenavigated', (frame) => {
      if (frame === p.mainFrame()) touchMedia().catch(() => {});
    });
  }
  if (onboarded) {
    await p.addInitScript(() =>
      localStorage.setItem('arborous:onboarding', JSON.stringify({ state: { onboarded: true }, version: 0 })),
    );
  }
  return { ctx, p };
}

const base = (port) => `http://127.0.0.1:${port}${BASE}`;

/** Chromium refuses to capture beyond this, and long before it refuses it
    takes longer than any sane timeout. Browse renders every item in the
    course at once, which at phone width is tens of thousands of pixels —
    151 fixture items reach the limit, and a real 498-item course measured
    168,640px. Clamping keeps the sweep honest about what it captured
    instead of dying on one page. */
const MAX_SHOT_PX = 16000;

async function shot(p, name) {
  await p.waitForTimeout(500);
  const tall = await p.evaluate(() => document.documentElement.scrollHeight);
  const file = path.join(OUT, `${name}.png`);
  if (tall > MAX_SHOT_PX) {
    const w = p.viewportSize().width;
    await p.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: MAX_SHOT_PX } });
    process.stdout.write(`  ${name}  (clipped: page is ${tall}px)\n`);
    return;
  }
  await p.screenshot({ path: file, fullPage: true });
  process.stdout.write(`  ${name}\n`);
}

const dist = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ has no index.html — run `npm run build` first.');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const server = await serve(dist);
const B = base(server.address().port);
const browser = await chromium.launch();

for (const size of ['desktop', 'phone']) {
  console.log(`${size}, populated:`);
  const { ctx, p } = await page(browser, size);
  await p.goto(B);
  await p.locator('input[type=file]').first().setInputFiles(FIXTURE);
  await p.waitForTimeout(1200);
  const id = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('arborous:courses')).state.courses)[0]);
  await p.evaluate(SEED_PROGRESS, id);
  await p.reload();
  const sectionId = await p.evaluate(
    (id) => JSON.parse(localStorage.getItem('arborous:courses')).state.courses[id].sections[3].id,
    id,
  );

  const theme = (mode) => p.evaluate((m) => document.documentElement.setAttribute('data-theme', m), mode);

  for (const [name, hash] of [
    ['library', ''],
    ['course', `#/study/${id}`],
    ['progress', `#/study/${id}/progress`],
    ['diagrams', `#/study/${id}/diagrams`],
    ['section', `#/study/${id}/section/${encodeURIComponent(sectionId)}`],
    ['learn', `#/session/${id}/learn`],
    ['quiz', `#/session/${id}/quiz`],
    ['flashcards', `#/session/${id}/flashcards`],
    ['browse', `#/session/${id}/browse`],
    ['help', '#/help'],
  ]) {
    await p.goto(B + hash);
    await theme('light');
    await shot(p, `${size}-${name}`);
  }

  // Dark, on the two screens carrying the most colour.
  for (const [name, hash] of [['course', `#/study/${id}`], ['progress', `#/study/${id}/progress`]]) {
    await p.goto(B + hash);
    await theme('dark');
    await shot(p, `${size}-${name}-dark`);
  }

  // The focus ring, which no static screenshot would otherwise show.
  await p.goto(B + `#/study/${id}`);
  await theme('light');
  for (let i = 0; i < 4; i++) await p.keyboard.press('Tab');
  await shot(p, `${size}-focus-ring`);

  await ctx.close();
}

for (const size of ['desktop', 'phone']) {
  console.log(`${size}, brand new:`);
  const first = await page(browser, size, { onboarded: false });
  await first.p.goto(B);
  await shot(first.p, `${size}-first-run`);
  await first.ctx.close();

  const empty = await page(browser, size);
  await empty.p.goto(B);
  await shot(empty.p, `${size}-empty-library`);
  await empty.p.goto(B + '#/help');
  await shot(empty.p, `${size}-help-new`);
  await empty.ctx.close();
}

await browser.close();
server.close();
console.log(`\n${OUT}`);
