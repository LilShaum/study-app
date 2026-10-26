import { toast } from '@/store/toast';

/** The commit this copy of the app was built from, short, for Help ("dev" locally). */
export const VERSION = (import.meta.env.VITE_BUILD_SHA as string | undefined)?.slice(0, 7) ?? 'dev';

/** A study session or a practice test: somewhere a reload would cost the student their place. */
const STUDYING = /^#\/(session\/|(study|class)\/[^/]+\/test\b)/;

/**
 * Whether reloading now loses nothing: not studying, no dialog open (a
 * paste in Add material), not typing.
 */
export function quietMoment(hash: string, doc: Document = document): boolean {
  if (STUDYING.test(hash)) return false;
  if (doc.querySelector('[role="dialog"]')) return false;
  const active = doc.activeElement;
  return !(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement);
}

/**
 * A new version reaches a student who keeps the app open.
 *
 * The service worker (src/sw.ts) takes over as soon as the browser finds a
 * new deploy, but the page already open keeps running the code it loaded.
 * An app on an iPhone's home screen is rarely reloaded: switching away and
 * back resumes the same page, for days, and the browser only looks for a
 * new worker on a navigation. The owner studied on a copy days old
 * (2026-10-26): options never shuffled, no "I don't know", while the live
 * site had both. A stale copy also hands out a stale generator prompt.
 *
 * So the app looks for a new version whenever it comes back into view, and
 * once one has taken over, reloads at a moment that loses nothing: at once
 * when quiet, on coming back to the app, or on leaving the session. In a
 * session a toast offers it; Learn picks up where it was (store/resume).
 */
export function watchForUpdates(): void {
  const sw = navigator.serviceWorker;
  if (!sw) return;
  // The first install takes control too; that is not a new version.
  let hadController = !!sw.controller;
  let pending = false;
  const reload = () => window.location.reload();

  sw.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (pending) return;
    pending = true;
    if (quietMoment(window.location.hash)) reload();
    else toast('A new version of Arborous is ready.', { duration: 15000, actionLabel: 'Reload', onAction: reload });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    // Back in the app before touching anything: the moment to swap.
    if (pending) reload();
    else void sw.getRegistration().then((r) => r?.update()).catch(() => {});
  });

  window.addEventListener('hashchange', () => {
    if (pending && quietMoment(window.location.hash)) reload();
  });
}
