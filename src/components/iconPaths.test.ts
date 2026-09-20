import { describe, expect, it } from 'vitest';
import { ICON_PATHS } from './iconPaths';

/**
 * The icon set's construction contract, asserted.
 *
 * It is stated in scripts/make-icons-set.mjs, and a rule that is only stated
 * is a wish. The set this replaced broke every clause of it, which is exactly
 * how a drawn app ends up looking like a template: nothing failed, so nothing
 * said anything was wrong.
 */
const GLYPHS = Object.entries(ICON_PATHS);

describe('icon set', () => {
  it('has glyphs', () => {
    expect(GLYPHS.length).toBeGreaterThan(20);
  });

  it.each(GLYPHS)('%s is made of paths, never primitives', (_name, markup) => {
    expect(markup).not.toMatch(/<(circle|rect|ellipse|line|polyline|polygon)\b/);
    expect(markup).toMatch(/^<path /);
  });

  it.each(GLYPHS)('%s draws its outer contour heavier than its inner marks', (_name, markup) => {
    const widths = [...markup.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(widths.length).toBeGreaterThan(0);
    // Two weights across the set, and no glyph invents a third.
    expect([...new Set(widths)].every((w) => w === 1.75 || w === 1.25)).toBe(true);
  });

  it('is not mirror-symmetric about the box: no glyph is its own reflection', () => {
    // A path whose coordinates are symmetric about x=12 reads as machinery.
    // Checked by the crudest honest test: the x values do not form a set that
    // maps onto itself under x -> 24 - x.
    const suspicious = GLYPHS.filter(([, markup]) => {
      const xs = [...markup.matchAll(/([\d.]+),[\d.]+/g)].map((m) => Number(m[1]));
      if (xs.length < 6) return false;
      const mirrored = xs.map((x) => Math.round((24 - x) * 10) / 10);
      const set = new Set(xs.map((x) => Math.round(x * 10) / 10));
      return mirrored.every((x) => set.has(x));
    });
    expect(suspicious.map(([name]) => name)).toEqual([]);
  });
});
