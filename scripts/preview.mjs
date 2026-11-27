/**
 * Builds a preview of the current branch that the owner can try on their own
 * phone before anything is merged, as a private claude.ai artifact.
 *
 *   node scripts/preview.mjs <outDir> [--fresh]
 *
 * Writes <outDir>/ with index.html and its assets, ready to publish with the
 * Artifact tool: `file_path: <outDir>/index.html`, and `files` mapping every
 * other file in <outDir> to its relative path (list them with
 * `find <outDir> -type f ! -name index.html`). Republish to the same artifact
 * URL each round so the owner keeps one link.
 *
 * What it changes from the real build, and why:
 * - relative asset paths (`--base ./`), since the artifact is not served
 *   under /study-app/;
 * - no service worker and no Content-Security-Policy <meta>: the artifact
 *   host serves its own policy, and a service worker would cache an old
 *   round on the owner's phone;
 * - a test lecture already in the library (scripts/__fixtures__, made up,
 *   never a student's) on first open, imported through the app's own file
 *   input so it is stored exactly as the app stores it. With --fresh, the
 *   library starts empty and the first run shows.
 *
 * Why it exists: the owner can only judge feel (swipes, motion, layout on
 * their phone) by trying it (2026-11-25: "I can't give you an answer for
 * shit like swiping unless I can test it myself"), and each round's preview
 * was rebuilt by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fresh = args.includes('--fresh');
const outArg = args.find((a) => !a.startsWith('--'));
if (!outArg) {
  console.error('usage: node scripts/preview.mjs <outDir> [--fresh]');
  process.exit(1);
}
const OUT = path.resolve(outArg);
if (OUT.startsWith(ROOT + path.sep)) {
  console.error('Write the preview outside the repo (the scratchpad), so it is never committed.');
  process.exit(1);
}
const FIXTURE = path.join(ROOT, 'scripts', '__fixtures__', 'biochem.study.json');

fs.rmSync(OUT, { recursive: true, force: true });
execFileSync('npx', ['vite', 'build', '--base', './', '--outDir', OUT, '--emptyOutDir'], {
  cwd: ROOT,
  stdio: 'inherit',
});

// No service worker on a preview: remove its files and its registration.
for (const f of fs.readdirSync(OUT)) {
  if (/^(sw|registerSW|workbox-[\w-]+)\.js(\.map)?$/.test(f)) fs.rmSync(path.join(OUT, f));
}
const indexFile = path.join(OUT, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8')
  .replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
  .replace(/\s*<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/, '')
  .replace(/\s*<link rel="manifest"[^>]*>/, '');

if (!fresh) {
  // Import the test lecture through the app itself, then copy what it stored.
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(OUT, rel);
    if (!file.startsWith(OUT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch().catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
  const p = await browser.newPage();
  await p.addInitScript(() =>
    localStorage.setItem('arborous:onboarding', JSON.stringify({ state: { onboarded: true }, version: 0 })),
  );
  await p.goto(`http://127.0.0.1:${server.address().port}/`);
  await p.locator('input[type=file]').first().setInputFiles(FIXTURE);
  await p.waitForTimeout(1500);
  const stored = await p.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('arborous:courses')) out[k] = localStorage.getItem(k);
    }
    return out;
  });
  await browser.close();
  server.close();
  if (!Object.keys(stored).length) throw new Error('The test lecture was not stored; did the import change?');
  // Seeded once, on the first open; the owner's own changes are kept after that.
  const seed = `<script>try{if(!localStorage.getItem('arborous:courses')){var s=${JSON.stringify(stored).replace(/</g, '\\u003c')};for(var k in s)localStorage.setItem(k,s[k]);}}catch(e){}</script>`;
  html = html.replace('<head>', `<head>\n  ${seed}`);
}

fs.writeFileSync(indexFile, html);
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full !== indexFile && !f.endsWith('.map')) files.push(path.relative(OUT, full));
  }
})(OUT);
console.log(`\nPreview in ${OUT}${fresh ? ' (fresh: empty library, first run)' : ' (test lecture in the library)'}`);
console.log(`Publish: file_path ${indexFile}, files: ${files.length} (${files.slice(0, 4).join(', ')}${files.length > 4 ? ', …' : ''})`);
