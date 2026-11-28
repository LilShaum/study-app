import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { scrollBehavior } from './motion';

/**
 * The keyboard through a page's list, on a computer (docs/proposals/
 * design-update.md, "The keyboard for everything"): J and K move to the next
 * and previous row, Enter opens the one with focus (it is a link or a
 * button), and / goes to the page's search box. Rows are marked
 * `data-list-item`, the search box `data-find`. Never while typing.
 */
export function useListKeys(enabled = true): void {
  useKeyboardShortcuts((e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') {
      const find = document.querySelector<HTMLInputElement>('[data-find]');
      if (!find) return;
      e.preventDefault();
      find.focus();
      return;
    }
    if (e.key !== 'j' && e.key !== 'k') return;
    // Not while something is open over the page.
    if (document.querySelector('[role="dialog"]')) return;
    const rows = [...document.querySelectorAll<HTMLElement>('[data-list-item]')].filter((el) => el.offsetParent !== null);
    if (!rows.length) return;
    e.preventDefault();
    const at = rows.findIndex((el) => el === document.activeElement || el.contains(document.activeElement));
    const next = at < 0 ? (e.key === 'j' ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, at + (e.key === 'j' ? 1 : -1)));
    rows[next].focus();
    rows[next].scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  }, enabled);
}
