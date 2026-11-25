import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

/** How far a finger must carry a card sideways, in pixels, to mean it. */
const SWIPE_PX = 72;
/** How long the card takes to slide off once the swipe is meant. */
const OUT_MS = 170;

/** Whether the touch began in something that scrolls sideways itself (a wide table or formula). */
function inSidewaysScroll(t: Element | null, stop: Element): boolean {
  for (let el = t; el && el !== stop; el = el.parentElement) {
    const x = getComputedStyle(el).overflowX;
    if ((x === 'auto' || x === 'scroll') && el.scrollWidth > el.clientWidth) return true;
  }
  return false;
}

/**
 * Turning the page with a finger, on a phone (docs/proposals/swipes.md):
 * one meaning only, left for on and right for back.
 *
 * Touch only: a mouse drags to select text. Up and down stays the page's
 * scroll (`touch-action: pan-y`, in the style this returns), so only a move
 * that is mostly sideways is a swipe; one that starts in a field, a button
 * still to be pressed, a link or a block that scrolls sideways is left to it. The card follows
 * the finger a little; past the mark it slides off, like a page, and the
 * action runs; short of it, it settles back.
 */
export function useSwipe({
  enabled,
  onLeft,
  onRight,
}: {
  enabled: boolean;
  onLeft?: () => void;
  onRight?: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [out, setOut] = useState<0 | 1 | -1>(0);
  // The frame the wrapper jumps back to its place, unseen: the card now in
  // it makes its own entrance (CardSession, page-in).
  const [snap, setSnap] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const sideways = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const reset = () => {
    start.current = null;
    sideways.current = false;
    setDx(0);
  };

  const leave = (dir: 1 | -1, act?: () => void) => {
    setOut(dir);
    timer.current = window.setTimeout(() => {
      act?.();
      setSnap(true);
      setOut(0);
      setDx(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setSnap(false)));
    }, OUT_MS);
  };

  const handlers = enabled
    ? {
        onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
          if (e.pointerType !== 'touch' || out) return;
          const t = e.target as Element;
          // An answered card's options are disabled buttons over most of it:
          // those carry no tap to protect, so a swipe may start on them.
          if (t.closest('input, textarea, select, button:not(:disabled), a, [contenteditable="true"]')) return;
          if (inSidewaysScroll(t, e.currentTarget)) return;
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          sideways.current = false;
        },
        onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
          const s = start.current;
          if (!s || s.id !== e.pointerId) return;
          const x = e.clientX - s.x;
          const y = e.clientY - s.y;
          if (!sideways.current) {
            if (Math.hypot(x, y) < 10) return;
            if (Math.abs(x) < Math.abs(y) * 1.5) {
              // Mostly up or down: the page's scroll, not ours.
              start.current = null;
              return;
            }
            sideways.current = true;
          }
          // Only the way that does something follows the finger.
          if ((x < 0 && !onLeft) || (x > 0 && !onRight)) return setDx(0);
          setDx(x);
        },
        onPointerUp: () => {
          if (!start.current) return reset();
          const moved = dx;
          start.current = null;
          sideways.current = false;
          if (moved <= -SWIPE_PX) leave(-1, onLeft);
          else if (moved >= SWIPE_PX) leave(1, onRight);
          else setDx(0);
        },
        onPointerCancel: reset,
      }
    : {};

  const style: CSSProperties = {
    touchAction: enabled ? 'pan-y' : undefined,
    transform: out ? `translateX(${out * 110}%)` : dx ? `translateX(${dx * 0.6}px)` : undefined,
    opacity: out ? 0 : undefined,
    transition: out
      ? `transform ${OUT_MS}ms ease-in, opacity ${OUT_MS}ms ease-in`
      : dx || snap
        ? 'none'
        : 'transform 220ms ease',
  };

  return { handlers, style };
}
