import { useEffect, useRef } from 'react';

/**
 * Binds a window-level keydown handler while `enabled`.
 *
 * Never fires while the user is typing in a form control — the item edit form
 * shares the app with these shortcuts, and hijacking "g" or "1" mid-sentence
 * would be worse than having no shortcuts at all.
 *
 * The handler is kept in a ref so callers can pass an inline closure without
 * rebinding the listener on every render.
 */
export function useKeyboardShortcuts(handler: (e: KeyboardEvent) => void, enabled = true): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      }
      handlerRef.current(e);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
