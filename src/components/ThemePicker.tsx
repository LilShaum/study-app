import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { TREE_THEMES, useThemeStore, type TreeName } from '@/store/theme';
import { Icon, type IconName } from './Icon';

function treeIcon(tree: TreeName): IconName {
  return `tree-${tree ?? 'default'}` as IconName;
}

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
          {/* Distinct silhouette per theme, so the button itself says which is active. */}
          <Icon name={treeIcon(tree)} size={18} />
          <span className="hidden sm:inline">{current.name}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded border border-border bg-surface p-1 shadow-md"
        >
          {TREE_THEMES.map((t) => (
            <DropdownMenu.Item
              key={t.name}
              onSelect={() => setTree(t.value)}
              className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-accent-light"
            >
              <Icon name={treeIcon(t.value)} size={18} className="shrink-0 text-text-2" />
              <span className="flex flex-col">
                <span className="text-text">{t.name}</span>
                <span className="text-xs text-text-3">{t.desc}</span>
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
