import { describe, expect, it } from 'vitest';
import { fallbackTop } from './statusBarFallback';

const iphone = { standalone: true, ios: true, reportedInset: 0, innerWidth: 393, innerHeight: 852, screenHeight: 852 };

describe('room for the iPhone status bar when iOS reports none', () => {
  it('pads a Dynamic Island iPhone whose page runs under the clock', () => {
    expect(fallbackTop(iphone)).toBe(59);
    expect(fallbackTop({ ...iphone, innerHeight: 844, screenHeight: 844 })).toBe(47);
  });
  it('leaves it to CSS when iOS reports the inset', () => {
    expect(fallbackTop({ ...iphone, reportedInset: 59 })).toBe(0);
  });
  it('does nothing in Safari, off iOS, in landscape, or below the status bar', () => {
    expect(fallbackTop({ ...iphone, standalone: false })).toBe(0);
    expect(fallbackTop({ ...iphone, ios: false })).toBe(0);
    expect(fallbackTop({ ...iphone, innerWidth: 852, innerHeight: 393 })).toBe(0);
    expect(fallbackTop({ ...iphone, innerHeight: 793 })).toBe(0);
  });
});
