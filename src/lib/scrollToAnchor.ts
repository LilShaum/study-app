/**
 * Jump to an element on the current page, without touching the URL.
 *
 * THIS EXISTS BECAUSE `<a href="#some-id">` DOES NOT WORK HERE. The app is
 * served from GitHub Pages and so routes through the hash: the hash is
 * already carrying the route. Setting it to `#some-id` does not scroll
 * anywhere — it tells the router the route is now `/some-id`, which matches
 * nothing, and drops the reader back in the library. Every topic link on the
 * help page did exactly that, and the section links on the diagrams page were
 * one click away from the same thing.
 *
 * Focus moves as well as the scroll position. A keyboard or screen-reader
 * user who only gets a scrolled viewport is still parked where they were,
 * with the next Tab taking them back to the list they just used.
 */
export function scrollToAnchor(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  // The target needs tabIndex={-1} for this to land anywhere.
  target.focus({ preventScroll: true });
}
