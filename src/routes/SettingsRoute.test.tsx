import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useProfileStore } from '@/store/profile';
import { useThemeStore } from '@/store/theme';

// No network in a test: the account reads as signed out.
vi.mock('@/lib/cloud', () => ({
  cloud: () => Promise.resolve({ auth: { getSession: () => Promise.resolve({ data: { session: null } }) } }),
  cloudError: (e: unknown) => String(e),
  syncNow: () => Promise.resolve(),
}));

import { SettingsRoute } from './SettingsRoute';

const open = () =>
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <SettingsRoute />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  useProfileStore.setState({ name: '' });
  useThemeStore.setState({ mode: null });
});

describe('Settings (the owner, 2026-11-25: one place for everything set once)', () => {
  it('holds the name, the theme, reminders, the account, backups and Help, in that order', () => {
    open();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Settings');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'You',
      'Appearance',
      'Reminders',
      'Account',
      'Your lectures',
      'Help',
    ]);
    expect(screen.getByRole('link', { name: 'Help' }).getAttribute('href')).toBe('/help');
    expect(screen.getByRole('link', { name: 'What’s new' }).getAttribute('href')).toBe('/help?s=new');
  });

  it('saves the name on leaving the field', () => {
    open();
    const field = screen.getByLabelText('Name');
    fireEvent.change(field, { target: { value: '  Sam ' } });
    fireEvent.blur(field);
    expect(useProfileStore.getState().name).toBe('Sam');
  });

  it('sets light, dark or the device’s own, one at a time', () => {
    open();
    expect(screen.getByRole('radio', { name: 'Match this device' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Dark' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Light' }).getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('radio', { name: 'Match this device' }));
    expect(useThemeStore.getState().mode).toBeNull();
  });

  it('offers signing in when signed out', async () => {
    open();
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Make an account' })).toBeTruthy();
  });
});
