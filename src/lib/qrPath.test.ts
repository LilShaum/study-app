import { describe, expect, it } from 'vitest';
import { qrPath } from './qrPath';

const grid = (rows: string[]) => (r: number, c: number) => rows[r][c] === '#';

describe('qrPath', () => {
  it('draws a hand-made 3x3 grid as exact rectangles', () => {
    const { d, viewBox } = qrPath(grid(['#.#', '.#.', '###']), 3, 0);
    expect(d).toBe('M0 0h1v1h-1zM2 0h1v1h-1zM1 1h1v1h-1zM0 2h3v1h-3z');
    expect(viewBox).toBe(3);
  });

  it('gives an empty path for an all-light grid', () => {
    expect(qrPath(() => false, 3).d).toBe('');
  });

  it('merges a run of dark modules into one rectangle', () => {
    const { d } = qrPath(grid(['##.', '...', '.##']), 3, 0);
    expect(d).toBe('M0 0h2v1h-2zM1 2h2v1h-2z');
  });

  it('offsets every coordinate by the quiet zone and widens the viewBox', () => {
    const { d, viewBox } = qrPath(grid(['#.#', '.#.', '###']), 3, 4);
    expect(d).toBe('M4 4h1v1h-1zM6 4h1v1h-1zM5 5h1v1h-1zM4 6h3v1h-3z');
    expect(viewBox).toBe(11);
  });

  it('defaults the quiet zone to 4 modules', () => {
    expect(qrPath(() => true, 1).d).toBe('M4 4h1v1h-1z');
    expect(qrPath(() => true, 1).viewBox).toBe(9);
  });
});
