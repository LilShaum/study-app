import { describe, expect, it } from 'vitest';
import { isSidewaysPhone } from '@/lib/sideways';

describe('isSidewaysPhone', () => {
  it('covers a phone on its side', () => {
    expect(isSidewaysPhone({ shortSide: 390, landscape: true, coarse: true })).toBe(true);
    expect(isSidewaysPhone({ shortSide: 430, landscape: true, coarse: true })).toBe(true);
  });

  it('leaves an upright phone alone', () => {
    expect(isSidewaysPhone({ shortSide: 390, landscape: false, coarse: true })).toBe(false);
  });

  // The owner, 2026-11-10: an iPad on its side should be the desktop view.
  it('leaves a tablet on its side alone', () => {
    expect(isSidewaysPhone({ shortSide: 744, landscape: true, coarse: true })).toBe(false);
    expect(isSidewaysPhone({ shortSide: 820, landscape: true, coarse: true })).toBe(false);
  });

  it('leaves a computer alone, however its window is shaped', () => {
    expect(isSidewaysPhone({ shortSide: 400, landscape: true, coarse: false })).toBe(false);
  });
});
