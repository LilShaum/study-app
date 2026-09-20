import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The focus ring, asserted rather than assumed.
 *
 * Before this existed the app had no `:focus-visible` rule at all, and six
 * controls cleared the browser's own outline in favour of a border-colour
 * change — so a keyboard user had no reliable indication of where they were.
 * The rule that replaced it is only worth anything while it is still there,
 * and `focus:outline-none` is one autocomplete away at any time.
 */

const SRC = path.join(__dirname, '..');
const INDEX_CSS = fs.readFileSync(path.join(SRC, 'styles', 'index.css'), 'utf8');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(tsx?|css)$/.test(entry.name) ? [full] : [];
  });
}

describe('focus ring', () => {
  it('is defined once, globally', () => {
    expect(INDEX_CSS).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-focus\)/);
  });

  it('is drawn outside the control, so it never fights the control\'s own fill', () => {
    expect(INDEX_CSS).toMatch(/:focus-visible\s*\{[^}]*outline-offset/);
  });

  it('is not cancelled anywhere', () => {
    const offenders = walk(SRC)
      .filter((file) => !file.endsWith('focus.test.ts'))
      .filter((file) => /focus:outline-none|outline:\s*none/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
  });
});
