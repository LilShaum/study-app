import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme';

/**
 * Applies the persisted light/dark choice to <html> as `data-theme`, which
 * theme.css keys off. Renders nothing; index.html also stamps the attribute
 * inline pre-hydration to avoid a flash of the wrong theme.
 *
 * It also clears any `data-tree` left on the element by the old four-theme
 * build, since a stale attribute there would select a palette that no longer
 * exists in the stylesheet.
 */
export function ThemeEffect() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;
    if (mode) root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
    root.removeAttribute('data-tree');
  }, [mode]);

  return null;
}
