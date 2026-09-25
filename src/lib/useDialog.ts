import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * What every modal owes the person using it: Escape closes it, the page
 * behind does not scroll while it is up, and focus goes back to whatever
 * opened it when it closes.
 *
 * Only the tree dialog did any of this; the new-course, add-material and
 * course-details dialogs ignored Escape entirely, found in the full
 * run-through. One hook so the next dialog cannot forget.
 *
 * `onClose` is read through a ref: parents pass an inline arrow, and binding
 * it directly would re-run this on every render — re-locking scroll and
 * re-capturing the opener each time.
 */
export function useDialog(onClose: () => void): void {
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      }
    };
    document.addEventListener('keydown', onKey);
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = scroll;
      opener?.focus?.();
    };
  }, []);
}
