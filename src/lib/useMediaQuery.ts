import { useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, kept current as the window changes.
 *
 * For layouts that differ in STRUCTURE, not just in spacing: the course page
 * puts its tree in a different place on a wide screen, and the tree is heavy
 * enough that drawing it twice and hiding one with CSS would cost a second
 * render of several thousand paths.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener('change', onChange);
      return () => list?.removeEventListener('change', onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}

/** The width at which the app lays pages out for a desktop screen. */
export const WIDE = '(min-width: 1024px)';
