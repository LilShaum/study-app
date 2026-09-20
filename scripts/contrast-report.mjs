#!/usr/bin/env node
/**
 * Prints the contrast ratio of every token pair that matters, for every
 * tree/mode combination, so a palette can be tuned against numbers instead
 * of guessed at and eyeballed.
 *
 * The same pairs are asserted by src/styles/contrast.test.ts; this is the
 * version you read while working.
 *
 *   node scripts/contrast-report.mjs [--fails]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const CSS = fs.readFileSync(path.join(root, '../src/styles/theme.css'), 'utf8');

/**
 * Every `--token: value` declared by the rule whose selector list contains
 * `selector`.
 *
 * Parses rule blocks rather than pattern-matching one selector, because the
 * file legitimately uses comma-separated selector lists and comments inside
 * blocks — both of which defeated a regex that just looked for
 * `<selector> {`, one silently (returning nothing) and one by matching a
 * different rule than the one asked for.
 */
const RULES = (() => {
  const out = [];
  const src = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const selectors = m[1].split(',').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const decls = {};
    for (const line of m[2].split(';')) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const k = line.slice(0, i).trim();
      if (k.startsWith('--')) decls[k] = line.slice(i + 1).trim();
    }
    if (Object.keys(decls).length) out.push({ selectors, decls });
  }
  return out;
})();

const block = (selector) => {
  const hit = RULES.filter((r) => r.selectors.includes(selector));
  if (!hit.length) return {};
  return Object.assign({}, ...hit.map((r) => r.decls));
};

const palette = (mode) => {
  let p = { ...block(':root') };
  if (mode === 'dark') p = { ...p, ...block(":root[data-theme='dark']") };
  return p;
};

const lum = (hex) => {
  const h = String(hex).trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const s = parseInt(full.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const PAIRS = [
  ['--color-text', '--color-bg', 4.5, 'body on page'],
  ['--color-text', '--color-surface', 4.5, 'body on card'],
  ['--color-text-2', '--color-surface', 4.5, 'secondary on card'],
  ['--color-text-2', '--color-bg', 4.5, 'secondary on page'],
  ['--color-text-3', '--color-surface', 4.5, 'tertiary on card'],
  ['--color-text-3', '--color-bg', 4.5, 'tertiary on page'],
  ['--color-accent', '--color-surface', 4.5, 'accent on card'],
  ['--color-accent', '--color-bg', 4.5, 'accent on page'],
  ['--color-accent', '--color-accent-light', 4.5, 'accent chip'],
  ['--color-success', '--color-surface', 4.5, 'correct on card'],
  ['--color-success', '--color-success-bg', 4.5, 'correct on tint'],
  ['--color-error', '--color-surface', 4.5, 'missed on card'],
  ['--color-error', '--color-error-bg', 4.5, 'missed on tint'],
  ['--color-warning', '--color-surface', 4.5, 'warning on card'],
  ['--color-warning', '--color-warning-bg', 4.5, 'warning on tint'],
  ['--color-easy', '--color-easy-bg', 4.5, 'easy badge'],
  ['--color-medium', '--color-medium-bg', 4.5, 'medium badge'],
  ['--color-hard', '--color-hard-bg', 4.5, 'hard badge'],
  ['--color-border-strong', '--color-surface', 3, 'control outline on card'],
  ['--color-border-strong', '--color-bg', 3, 'control outline on page'],
];

const onlyFails = process.argv.includes('--fails');
let failures = 0;
for (const mode of ['light', 'dark']) {
  {
    const p = palette(mode);
    const rows = PAIRS.map(([fg, bg, min, label]) => {
      const missing = !p[fg] || !p[bg];
      const r = missing ? 0 : ratio(p[fg], p[bg]);
      const ok = !missing && r >= min;
      if (!ok) failures++;
      return { label, r, min, ok, missing };
    });
    const shown = onlyFails ? rows.filter((x) => !x.ok) : rows;
    if (!shown.length) continue;
    console.log(`\n${mode}`);
    for (const x of shown) {
      const mark = x.ok ? ' ok ' : 'FAIL';
      const val = x.missing ? 'missing token' : `${x.r.toFixed(2)}:1 (needs ${x.min})`;
      console.log(`  ${mark}  ${val.padEnd(22)} ${x.label}`);
    }
  }
}
console.log(`\n${failures} failing pair(s) across both modes.`);
process.exit(failures ? 1 : 0);
