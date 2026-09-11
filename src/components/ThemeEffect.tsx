import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme';

/**
 * Applies the persisted theme/tree choice to <html> as data-theme / data-tree
 * attributes — the same mechanism the vanilla app used (Theme.apply /
 * TreeTheme.apply), which theme.css's selectors key off of. Renders nothing;
 * index.html also stamps these attributes inline pre-hydration to avoid a
 * flash of the wrong theme.
 */
export function ThemeEffect() {
  const mode = useThemeStore((s) => s.mode);
  const tree = useThemeStore((s) => s.tree);

  useEffect(() => {
    const root = document.documentElement;
    if (mode) root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    if (tree) root.setAttribute('data-tree', tree);
    else root.removeAttribute('data-tree');
  }, [tree]);

  return null;
}
