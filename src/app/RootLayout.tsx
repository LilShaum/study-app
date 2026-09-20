import { Link, Outlet } from 'react-router-dom';
import { ThemeEffect } from '@/components/ThemeEffect';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { Toaster } from '@/components/Toaster';
import { Onboarding } from '@/components/Onboarding';
import { Icon } from '@/components/Icon';
import { Sprig } from '@/components/Sprig';

export function RootLayout() {
  return (
    <div className="app-shell paper-grain flex min-h-screen flex-col bg-bg">
      <ThemeEffect />
      <header className="app-header flex min-h-header shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-heading font-semibold tracking-tight text-text"
        >
          <Sprig className="h-6" />
          Arborous
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/help"
            aria-label="Help"
            title="How Arborous works"
            className="tap-safe flex h-8 w-8 items-center justify-center rounded border border-border text-text-2 hover:border-border-strong hover:text-text"
          >
            <Icon name="help-circle" size={16} />
          </Link>
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
