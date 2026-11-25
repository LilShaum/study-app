import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

/** How far a finger must carry a card sideways, in pixels, to mean it. */
const SWIPE_PX = 72;

/**
 * A sideways swipe on a phone (docs/proposals/design-update.md, "Swipes").
 *
 * Touch only: a mouse drags to select text. Up and down stays the page's
 * scroll (`touch-action: pan-y` on the element, which this returns in its
 * style), so only a move that is mostly sideways is a swipe. A move that
 * starts in a field, or on a link or button, is left to it. While the finger
 * is down the element follows it a little, so the gesture is seen to work;
 * let go short of the mark and it settles back.
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
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const sideways = useRef(false);

  const reset = () => {
    start.current = null;
    sideways.current = false;
    setDx(0);
  };

  const handlers = enabled
    ? {
        onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
          if (e.pointerType !== 'touch') return;
          const t = e.target as Element;
          if (t.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
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
          if (dx <= -SWIPE_PX) onLeft?.();
          else if (dx >= SWIPE_PX) onRight?.();
          reset();
        },
        onPointerCancel: reset,
      }
    : {};

  const style: CSSProperties = {
    touchAction: enabled ? 'pan-y' : undefined,
    transform: dx ? `translateX(${dx * 0.6}px) rotate(${dx * 0.012}deg)` : undefined,
    transition: dx ? 'none' : 'transform 220ms ease',
  };

  /** Which way the finger is carrying it past the mark, to name the verdict as it is made. */
  const leaning: 'left' | 'right' | null = dx <= -SWIPE_PX ? 'left' : dx >= SWIPE_PX ? 'right' : null;

  return { handlers, style, dx, leaning };
}
