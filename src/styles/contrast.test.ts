import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * WCAG contrast over the token file itself.
 *
 * This lives as a test rather than a browser script because the space is
 * combinatorial — four trees x light/dark x every token pair a screen
 * actually renders — and eyeballing screenshots cannot cover it. A palette
 * this size will always have one combination nobody happened to look at;
 * before this existed, 33 of 72 pairs failed and every one of them had been
 * shipped past by eye.
 */

const CSS = fs.readFileSync(path.join(__dirname, 'theme.css'), 'utf8');

/**
 * Every `--token: value` declared by the rule whose selector list contains
 * `selector`.
 *
 * Parses rule blocks rather than pattern-matching one selector, because the
 * file legitimately uses comma-separated selector lists and comments inside
 * blocks — both of which defeated a regex that just looked for
 * `<selector> {`, one silently returning nothing and one matching a
 * different rule than the one asked for.
 */
const RULES: { selectors: string[]; decls: Record<string, string> }[] = (() => {
  const out: { selectors: string[]; decls: Record<string, string> }[] = [];
  const src = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const selectors = m[1].split(',').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const decls: Record<string, string> = {};
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

function block(selector: string): Record<string, string> {
  const hit = RULES.filter((r) => r.selectors.includes(selector));
  if (!hit.length) throw new Error(`no rule in theme.css selects: ${selector}`);
  return Object.assign({}, ...hit.map((r) => r.decls));
}

export type Tree = 'default' | 'winter' | 'banyan' | 'fig';
export type Mode = 'light' | 'dark';

/**
 * The palette a browser would actually compute for one tree/mode pair.
 *
 * Applied in cascade order: base, then the dark overrides, then the tree's
 * own light values, then the tree's dark values. That mirrors the file, where
 * the tree blocks come after the dark block at equal specificity and the
 * `[data-tree][data-theme]` pair outranks both.
 */
export function palette(tree: Tree, mode: Mode): Record<string, string> {
  let p = { ...block(':root') };
  if (mode === 'dark') p = { ...p, ...block(":root[data-theme='dark']") };
  if (tree !== 'default') {
    p = { ...p, ...block(`:root[data-tree='${tree}']`) };
    p = { ...p, ...block(`:root[data-tree='${tree}'][data-theme='${mode}']`) };
  }
  return p;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TREES: Tree[] = ['default', 'winter', 'banyan', 'fig'];
const MODES: Mode[] = ['light', 'dark'];

/** Text pairs, at AA for body text. */
const TEXT_PAIRS: [string, string, string][] = [
  ['--color-text', '--color-bg', 'body text on the page'],
  ['--color-text', '--color-surface', 'body text on a card'],
  ['--color-text-2', '--color-surface', 'secondary text on a card'],
  ['--color-text-2', '--color-bg', 'secondary text on the page'],
  ['--color-text-3', '--color-surface', 'tertiary text on a card'],
  ['--color-text-3', '--color-bg', 'tertiary text on the page'],
  ['--color-accent', '--color-surface', 'an accent link on a card'],
  ['--color-accent', '--color-bg', 'an accent link on the page'],
  ['--color-success', '--color-surface', '"correct" on a card'],
  ['--color-error', '--color-surface', '"missed" on a card'],
  ['--color-warning', '--color-surface', 'a warning on a card'],
  ['--color-easy', '--color-surface', 'the easy badge'],
  ['--color-medium', '--color-surface', 'the medium badge'],
  ['--color-hard', '--color-surface', 'the hard badge'],
];

/** Status text sits on its own tinted background as often as on the card. */
const ON_TINT_PAIRS: [string, string, string][] = [
  ['--color-success', '--color-success-bg', '"correct" on its own tint'],
  ['--color-error', '--color-error-bg', '"missed" on its own tint'],
  ['--color-warning', '--color-warning-bg', 'a warning on its own tint'],
  ['--color-accent', '--color-accent-light', 'an accent chip'],
  ['--color-easy', '--color-easy-bg', 'the easy badge on its tint'],
  ['--color-medium', '--color-medium-bg', 'the medium badge on its tint'],
  ['--color-hard', '--color-hard-bg', 'the hard badge on its tint'],
];

/**
 * A control's own outline. WCAG 1.4.11 wants 3:1 for the boundary of
 * something you interact with — an option button, a text field, the select.
 */
const CONTROL_PAIRS: [string, string, string][] = [
  ['--color-border-strong', '--color-surface', 'a control outline on a card'],
  ['--color-border-strong', '--color-bg', 'a control outline on the page'],
];

describe.each(TREES)('%s', (tree) => {
  describe.each(MODES)('%s', (mode) => {
    const p = palette(tree, mode);
    const ratio = (a: string, b: string) => contrast(p[a], p[b]);

    it.each(TEXT_PAIRS)('%s vs %s — %s reaches AA (4.5:1)', (fg, bg) => {
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(ON_TINT_PAIRS)('%s vs %s — %s reaches AA (4.5:1)', (fg, bg) => {
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(CONTROL_PAIRS)('%s vs %s — %s reaches 3:1', (fg, bg) => {
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(3);
    });
  });
});
