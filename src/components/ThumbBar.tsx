import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The main thing to do on a screen, held at the bottom of a phone where the
 * thumb is, however far the page has scrolled (docs/proposals/design-update.md,
 * "The thumb bar"). Only on a screen with one main action: a bar on every
 * page would be chrome the book look does not have.
 *
 * While it shows it tells the page how tall it is (--pinned-bottom), so
 * messages rise above it instead of covering its button. Not on the wide
 * layout, where the action is in view beside everything else.
 */
export function ThumbBar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const set = () => root.style.setProperty('--pinned-bottom', `${el.offsetHeight}px`);
    set();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(set) : null;
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.removeProperty('--pinned-bottom');
    };
  }, []);
  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-strong bg-bg/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur wide:hidden"
    >
      <div className="mx-auto max-w-[44rem]">{children}</div>
    </div>
  );
}
