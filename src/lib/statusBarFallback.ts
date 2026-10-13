/**
 * Room for the iPhone status bar when iOS will not say how much.
 *
 * The page asks for it with env(safe-area-inset-top) (index.css, app-header).
 * On the owner's iPhone the home-screen app draws the page under the clock
 * and still reports an inset of 0, so the header sat under the clock and
 * signal icons even at the top of a page (2026-10-13). This measures that
 * case and only that case: installed, on iOS, the page as tall as the whole
 * screen (so under the status bar), and no inset reported. Then it sets
 * --safe-top-fallback to the status bar's height for that kind of iPhone,
 * which the header and the status-bar cover take as a minimum.
 */

/** Status bar heights by the screen's height in points (portrait). */
export function statusBarFor(screenHeight: number): number {
  // Dynamic Island: 14 Pro, 15, 16 and their Plus/Pro Max sizes.
  if ([852, 874, 932, 956].includes(screenHeight)) return 59;
  // Notch: X to 14.
  if ([812, 844, 896, 926].includes(screenHeight)) return 47;
  return 20;
}

export function fallbackTop(env: {
  standalone: boolean;
  ios: boolean;
  reportedInset: number;
  innerWidth: number;
  innerHeight: number;
  screenHeight: number;
}): number {
  if (!env.standalone || !env.ios || env.reportedInset > 0) return 0;
  // Landscape: the status bar is hidden. (iOS keeps screen.width and
  // screen.height in portrait whichever way the phone is held.)
  if (env.innerWidth > env.innerHeight) return 0;
  // Only when the page really runs under the status bar.
  if (env.innerHeight < env.screenHeight - 1) return 0;
  return statusBarFor(env.screenHeight);
}

function measure(): void {
  const nav = navigator as Navigator & { standalone?: boolean };
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top)';
  document.body.appendChild(probe);
  const reportedInset = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  const px = fallbackTop({
    standalone: window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true,
    ios: /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    reportedInset,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenHeight: window.screen.height,
  });
  document.documentElement.style.setProperty('--safe-top-fallback', `${px}px`);
}

export function watchStatusBar(): void {
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', measure);
}
