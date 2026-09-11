import { useSyncExternalStore } from 'react';
import { useThemeStore } from '@/store/theme';

function subscribeSystemScheme(callback: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

/** Cycles light → dark, matching the vanilla Theme.toggle behavior. */
export function DarkModeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  // System preference only matters for display when mode hasn't been set
  // explicitly; useSyncExternalStore keeps this correct across OS changes.
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemScheme,
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );
  const isDark = mode === 'dark' || (mode === null && systemPrefersDark);

  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded border border-border bg-surface text-text-2 hover:text-text"
      title="Toggle dark mode"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setMode(isDark ? 'light' : 'dark')}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
