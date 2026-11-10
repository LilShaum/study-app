/**
 * Below this, the screen's short side is a phone's. Phones are about 320 to
 * 430 across; the smallest iPad is 744 and a folding phone opened is wider
 * than 600.
 */
const PHONE_SHORT_SIDE = 500;

export interface Screen {
  /** The device screen's short side, in CSS pixels. */
  shortSide: number;
  /** The device is turned on its side (from the screen, not the window). */
  landscape: boolean;
  /** A touch screen is the main pointer. */
  coarse: boolean;
}

/** A phone held on its side: the one case the page is covered. */
export function isSidewaysPhone(s: Screen): boolean {
  return s.coarse && s.landscape && s.shortSide < PHONE_SHORT_SIDE;
}
