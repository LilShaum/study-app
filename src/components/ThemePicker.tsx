import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { TREE_THEMES, useThemeStore } from '@/store/theme';

/** Picks a tree theme (default/winter/banyan/fig) — a Radix primitive wired to useThemeStore. */
export function ThemePicker() {
  const tree = useThemeStore((s) => s.tree);
  const setTree = useThemeStore((s) => s.setTree);
  const current = TREE_THEMES.find((t) => t.value === tree) ?? TREE_THEMES[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded border border-border bg-surface px-2.5 text-sm text-text-2 hover:text-text"
          title={`Theme: ${current.name} — click to switch`}
          aria-label={`Current theme: ${current.name}. Click to switch.`}
        >
          <span aria-hidden="true">🌳</span>
          <span className="hidden sm:inline">{current.name}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-44 rounded border border-border bg-surface p-1 shadow-md"
        >
          {TREE_THEMES.map((t) => (
            <DropdownMenu.Item
              key={t.name}
              onSelect={() => setTree(t.value)}
              className="flex cursor-pointer flex-col rounded px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-accent-light"
            >
              <span className="text-text">{t.name}</span>
              <span className="text-xs text-text-3">{t.desc}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
