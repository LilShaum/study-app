import { Link, Outlet } from 'react-router-dom';
import { ThemeEffect } from '@/components/ThemeEffect';
import { ThemePicker } from '@/components/ThemePicker';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { Toaster } from '@/components/Toaster';

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <ThemeEffect />
      <header className="flex h-header shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <Link to="/" className="text-lg font-semibold text-accent">
          Arborous
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemePicker />
          <DarkModeToggle />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
