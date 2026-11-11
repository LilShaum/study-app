import { describe, expect, it } from 'vitest';
import { dateUnit, dayLeaf } from './dayLeaf';

const SIZE = 11;

/** The points a path passes through or is pulled toward, in order. */
const points = (d: string) => {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const out: [number, number][] = [];
  for (let i = 0; i < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
};

const box = (d: string) => {
  const p = points(d);
  const xs = p.map(([x]) => x);
  const ys = p.map(([, y]) => y);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), xs, ys };
};

describe('dateUnit', () => {
  it('is the same for the same date and salt, between 0 and 1', () => {
    expect(dateUnit('2025-11-04')).toBe(dateUnit('2025-11-04'));
    for (const d of ['2025-01-01', '2025-11-04', '2026-02-28']) {
      for (const salt of [0, 1, 2, 3]) {
        const u = dateUnit(d, salt);
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThan(1);
      }
    }
  });

  it('differs between neighbouring days and between salts', () => {
    const days = Array.from({ length: 30 }, (_, i) => `2025-11-${String(i + 1).padStart(2, '0')}`);
    expect(new Set(days.map((d) => dateUnit(d).toFixed(3))).size).toBeGreaterThan(25);
    expect(dateUnit('2025-11-04', 1)).not.toBe(dateUnit('2025-11-04', 2));
  });
});

describe('dayLeaf', () => {
  it('draws with curves only: no primitives, no straight polygons', () => {
    for (const level of [0, 1, 2, 3, 4] as const) {
      const leaf = dayLeaf('2025-11-04', level, SIZE);
      expect(leaf.blade).toMatch(/^M[^A-Za-z]+(C[^A-Za-z]+)+Z$/);
      expect(leaf.stalk).toMatch(/^M[^A-Za-z]+Q[^A-Za-z]+$/);
      if (leaf.vein) expect(leaf.vein).toMatch(/^M[^A-Za-z]+Q[^A-Za-z]+$/);
    }
  });

  it('is the same leaf for the same day, and a different one for another', () => {
    expect(dayLeaf('2025-11-04', 3, SIZE)).toEqual(dayLeaf('2025-11-04', 3, SIZE));
    expect(dayLeaf('2025-11-05', 3, SIZE).blade).not.toBe(dayLeaf('2025-11-04', 3, SIZE).blade);
  });

  it('grows with the time studied, and a day without is smaller than any leaf', () => {
    // Over many days, so a day's own variation cannot carry the result.
    const days = Array.from({ length: 28 }, (_, i) => `2025-10-${String(i + 1).padStart(2, '0')}`);
    const reach = (level: 0 | 1 | 2 | 3 | 4) =>
      days.reduce((s, d) => {
        const b = box(dayLeaf(d, level, SIZE).blade);
        return s + Math.hypot(b.w, b.h);
      }, 0) / days.length;
    const sizes = ([0, 1, 2, 3, 4] as const).map(reach);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
  });

  it('keeps even the largest leaf near its own cell, so a column still reads as a week', () => {
    for (let i = 1; i <= 28; i++) {
      const b = box(dayLeaf(`2025-10-${String(i).padStart(2, '0')}`, 4, SIZE).blade);
      expect(Math.min(...b.xs)).toBeGreaterThan(-2);
      expect(Math.max(...b.xs)).toBeLessThan(SIZE + 2);
      expect(Math.min(...b.ys)).toBeGreaterThan(-2);
      expect(Math.max(...b.ys)).toBeLessThan(SIZE + 2);
    }
  });

  it('is not its own mirror image: one side of the blade is fuller than the other', () => {
    const leaf = dayLeaf('2025-11-04', 4, SIZE);
    const [base, a1, a2, tip, b1, b2] = points(leaf.blade);
    // Distance of each control point from the midrib (base to tip).
    const off = ([x, y]: [number, number]) => {
      const [bx, by] = base;
      const [tx, ty] = tip;
      return Math.abs((tx - bx) * (by - y) - (bx - x) * (ty - by)) / Math.hypot(tx - bx, ty - by);
    };
    const sideA = off(a1) + off(a2);
    const sideB = off(b1) + off(b2);
    expect(Math.abs(sideA - sideB) / Math.max(sideA, sideB)).toBeGreaterThan(0.08);
  });

  it('has a midrib only where the blade is large enough to carry one', () => {
    expect(dayLeaf('2025-11-04', 1, SIZE).vein).toBeNull();
    expect(dayLeaf('2025-11-04', 2, SIZE).vein).toBeNull();
    expect(dayLeaf('2025-11-04', 3, SIZE).vein).not.toBeNull();
    expect(dayLeaf('2025-11-04', 4, SIZE).vein).not.toBeNull();
    expect(dayLeaf('2025-11-04', 0, SIZE).vein).toBeNull();
  });
});
