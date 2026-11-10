import { useSyncExternalStore } from 'react';
import { Sprig } from '@/components/Sprig';
import { isSidewaysPhone, type Screen } from '@/lib/sideways';

function readScreen(): Screen {
  const type = window.screen.orientation?.type;
  // Safari before 16.4 has no screen.orientation, only window.orientation.
  const legacy = (window as unknown as { orientation?: number }).orientation;
  const landscape = type ? type.startsWith('landscape') : Math.abs(legacy ?? 0) === 90;
  return {
    shortSide: Math.min(window.screen.width, window.screen.height),
    landscape,
    coarse: window.matchMedia?.('(pointer: coarse)').matches ?? false,
  };
}

function subscribe(onChange: () => void): () => void {
  const orientation = window.screen.orientation;
  orientation?.addEventListener?.('change', onChange);
  window.addEventListener('orientationchange', onChange);
  window.addEventListener('resize', onChange);
  return () => {
    orientation?.removeEventListener?.('change', onChange);
    window.removeEventListener('orientationchange', onChange);
    window.removeEventListener('resize', onChange);
  };
}

const sideways = () => isSidewaysPhone(readScreen());

/**
 * The owner, 2026-11-10: "make it so the app cant rotate on the phone". A
 * web page cannot stop an iPhone turning (iOS gives it no lock), so a phone
 * on its side gets this cover instead, and the page waits under it, as it
 * was, until the phone is upright again. Read from the screen's own
 * orientation, never the window's shape: a keyboard that shortens the
 * window must not cover what is being typed. A tablet on its side is
 * untouched; it gets the desktop layout.
 */
export function UprightOnly() {
  const cover = useSyncExternalStore(subscribe, sideways, () => false);
  if (!cover) return null;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="upright-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-bg px-8 text-center"
    >
      <div className="text-text-3">
        <Sprig size={28} />
      </div>
      <p id="upright-title" className="font-display text-heading font-semibold text-text">
        Turn your phone upright
      </p>
      <p className="max-w-sm text-balance text-small text-text-2">
        Arborous is set for a phone held upright. Your place is kept.
      </p>
    </div>
  );
}
