import { useSyncExternalStore } from 'react';
import { useThemeStore } from '@/store/theme';
import { Icon } from './Icon';

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
      className="press press-quiet"
      title="Toggle dark mode"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setMode(isDark ? 'light' : 'dark')}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={14} />
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
