/**
 * Whether the reader has asked for less movement.
 *
 * The stylesheet handles everything CSS drives, but a scroll started from
 * script does not go through it: `scrollIntoView({ behavior: 'smooth' })`
 * names its behaviour outright, and an explicit option beats the
 * `scroll-behavior` property rather than deferring to it. So any scroll the
 * app starts itself has to ask.
 *
 * Returns false where matchMedia does not exist — under test, and in any
 * renderer that cannot tell us — because animating is the normal case and a
 * missing answer is not a request for stillness.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** How a script-driven scroll should behave for this reader. */
export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');
