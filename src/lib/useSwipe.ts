import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { prefersReducedMotion } from './motion';

/** How far a finger must carry a card sideways, in pixels, to mean it. */
const SWIPE_PX = 72;
/** A flick: shorter than that, but this fast (px per ms) and this far, in the same direction. */
const FLICK_SPEED = 0.45;
const FLICK_PX = 24;
/** The slide off: at least this fast (px per ms), and within these times, whatever the finger did. */
const OUT_MIN_SPEED = 1.8;
const OUT_MIN_MS = 110;
const OUT_MAX_MS = 260;
/**
 * The next page coming in from the far edge: it starts at the speed the last
 * one left at and settles. Its curve starts at twice its mean speed (the
 * first control point's slope), so its length is set from that speed.
 */
const IN_CURVE = 'cubic-bezier(0.33, 0.66, 0.4, 1)';
const IN_START_SLOPE = 2;
const IN_MIN_MS = 240;
const IN_MAX_MS = 420;
/** How far back the finger's speed is read, in ms. */
const SPEED_WINDOW_MS = 90;

/** Whether the touch began in something that scrolls sideways itself (a wide table or formula). */
function inSidewaysScroll(t: Element | null, stop: Element): boolean {
  for (let el = t; el && el !== stop; el = el.parentElement) {
    const x = getComputedStyle(el).overflowX;
    if ((x === 'auto' || x === 'scroll') && el.scrollWidth > el.clientWidth) return true;
  }
  return false;
}

type Phase = 'rest' | 'drag' | 'out' | 'enter-from' | 'enter';

/**
 * Turning the page with a finger, on a phone (docs/proposals/swipes.md):
 * one meaning only, left for on and right for back.
 *
 * One continuous motion (the owner, 2026-11-25: "make the transition from
 * one to the next page more smooth. Right now it looks like you swipe halfway
 * and when you let go it just jumps"). The page stays under the finger, one
 * to one; let go, it carries on the way and at the speed the finger sent it,
 * all the way off the screen; the next page slides in from the other edge at
 * once, settling as it arrives. It used to follow at 60%, fade out in 170 ms
 * and snap back unseen, and the next card faded in from 40 px: a jump.
 *
 * Touch only: a mouse drags to select text. Up and down stays the page's
 * scroll (`touch-action: pan-y`, in the style this returns), so only a move
 * that is mostly sideways is a swipe; one that starts in a field, a button
 * still to be pressed, a link or a block that scrolls sideways is left to it.
 * Short of the mark, and not a flick, the page settles back. The wrapper's
 * parent should clip sideways (`overflow-x-clip`), so a page off the screen
 * never widens it.
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
  const [phase, setPhase] = useState<Phase>('rest');
  /** Which way the page went: -1 off to the left (on), 1 off to the right (back). */
  const [dir, setDir] = useState<1 | -1>(-1);
  const [outMs, setOutMs] = useState(OUT_MAX_MS);
  const [inMs, setInMs] = useState(IN_MAX_MS);
  const [width, setWidth] = useState(400);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const sideways = useRef(false);
  const samples = useRef<{ x: number; t: number }[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const reset = () => {
    start.current = null;
    sideways.current = false;
    samples.current = [];
    setDx(0);
    setPhase('rest');
  };

  /** The finger's speed along x at the moment it let go, px per ms. */
  const speed = () => {
    const s = samples.current;
    const last = s[s.length - 1];
    if (!last) return 0;
    const first = s.find((p) => last.t - p.t <= SPEED_WINDOW_MS) ?? last;
    return last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
  };

  const turn = (to: 1 | -1, moved: number, v: number, act?: () => void) => {
    if (prefersReducedMotion()) {
      act?.();
      reset();
      return;
    }
    const off = to * width;
    // Off at the finger's own speed, steady, so letting go changes nothing
    // in the motion (a slow drag still goes briskly); the next page comes in
    // at that same speed and only then slows to rest.
    const pace = Math.max(Math.abs(v), OUT_MIN_SPEED);
    const ms = Math.round(Math.min(OUT_MAX_MS, Math.max(OUT_MIN_MS, Math.abs(off - moved) / pace)));
    const leaving = Math.abs(off - moved) / ms;
    setInMs(Math.round(Math.min(IN_MAX_MS, Math.max(IN_MIN_MS, (IN_START_SLOPE * width) / leaving))));
    setDir(to);
    setOutMs(ms);
    setPhase('out');
    later(() => {
      act?.();
      // The next page, placed at the far edge unseen, then brought in.
      setDx(0);
      setPhase('enter-from');
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('enter')));
      later(() => setPhase('rest'), IN_MAX_MS + 40);
    }, ms);
  };

  const busy = phase === 'out' || phase === 'enter-from' || phase === 'enter';

  const handlers = enabled
    ? {
        onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
          if (e.pointerType !== 'touch' || busy) return;
          const t = e.target as Element;
          // An answered card's options are disabled buttons over most of it:
          // those carry no tap to protect, so a swipe may start on them.
          if (t.closest('input, textarea, select, button:not(:disabled), a, [contenteditable="true"]')) return;
          if (inSidewaysScroll(t, e.currentTarget)) return;
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          sideways.current = false;
          samples.current = [{ x: e.clientX, t: e.timeStamp }];
          setWidth(Math.max(e.currentTarget.offsetWidth, window.innerWidth) + 24);
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
            setPhase('drag');
          }
          samples.current.push({ x: e.clientX, t: e.timeStamp });
          if (samples.current.length > 12) samples.current.shift();
          // Only the way that does something follows the finger.
          if ((x < 0 && !onLeft) || (x > 0 && !onRight)) return setDx(0);
          setDx(x);
        },
        onPointerUp: () => {
          if (!start.current || !sideways.current) return reset();
          const moved = dx;
          const v = speed();
          start.current = null;
          sideways.current = false;
          const flick = Math.abs(v) >= FLICK_SPEED && Math.abs(moved) >= FLICK_PX && Math.sign(v) === Math.sign(moved);
          if (moved < 0 && onLeft && (moved <= -SWIPE_PX || flick)) turn(-1, moved, v, onLeft);
          else if (moved > 0 && onRight && (moved >= SWIPE_PX || flick)) turn(1, moved, v, onRight);
          else {
            setDx(0);
            setPhase('rest');
          }
        },
        onPointerCancel: reset,
      }
    : {};

  const style: CSSProperties = {
    touchAction: enabled ? 'pan-y' : undefined,
    transform:
      phase === 'drag' && dx
        ? `translateX(${dx}px)`
        : phase === 'out'
          ? `translateX(${dir * width}px)`
          : phase === 'enter-from'
            ? `translateX(${-dir * width}px)`
            : undefined,
    transition:
      phase === 'out'
        ? `transform ${outMs}ms linear`
        : phase === 'enter'
          ? `transform ${inMs}ms ${IN_CURVE}`
          : phase === 'drag' || phase === 'enter-from'
            ? 'none'
            : 'transform 220ms ease',
    willChange: phase === 'rest' ? undefined : 'transform',
  };

  return { handlers, style };
}
