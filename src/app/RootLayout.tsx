import { Link, Outlet } from 'react-router-dom';
import { ThemeEffect } from '@/components/ThemeEffect';
import { ThemePicker } from '@/components/ThemePicker';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { Toaster } from '@/components/Toaster';
import { Onboarding } from '@/components/Onboarding';
import { Icon } from '@/components/Icon';

export function RootLayout() {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-bg">
      <ThemeEffect />
      <header className="app-header flex min-h-header shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <Link to="/" className="text-lg font-semibold text-accent">
          Arborous
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/help"
            aria-label="Help"
            title="How Arborous works"
            className="tap-safe flex h-8 w-8 items-center justify-center rounded border border-border text-text-2 hover:border-accent-border hover:text-text"
          >
            <Icon name="help-circle" size={16} />
          </Link>
          <ThemePicker />
          <DarkModeToggle />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster />
      <Onboarding />
    </div>
  );
}
