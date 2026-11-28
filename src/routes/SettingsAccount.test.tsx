import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Signed in as sam@example.com, with updateUser recorded.
const updateUser = vi.fn(() => Promise.resolve({ error: null }));
vi.mock('@/lib/cloud', () => ({
  cloud: () =>
    Promise.resolve({
      auth: {
        getSession: () => Promise.resolve({ data: { session: { user: { email: 'sam@example.com' } } } }),
        updateUser,
        signOut: () => Promise.resolve({}),
      },
    }),
  cloudError: (e: unknown) => String(e),
  syncNow: () => Promise.resolve(),
}));

import { SettingsRoute } from './SettingsRoute';

afterEach(() => {
  cleanup();
  updateUser.mockClear();
});

const open = () =>
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <SettingsRoute />
    </MemoryRouter>,
  );

describe('Settings, signed in', () => {
  it('shows the email, Sync now and Sign out', async () => {
    open();
    expect(await screen.findByText('sam@example.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  });

  it('changes the password in place', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Change password' }));
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'longenough' } });
    fireEvent.submit(screen.getByLabelText('New password').closest('form')!);
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: 'longenough' }));
    await waitFor(() => expect(screen.queryByLabelText('New password')).toBeNull());
  });

  it('changes the email in place, and the toggle closes the form again', async () => {
    open();
    const toggle = await screen.findByRole('button', { name: 'Change email' });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.change(screen.getByLabelText('New email'), { target: { value: 'new@example.com' } });
    fireEvent.submit(screen.getByLabelText('New email').closest('form')!);
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ email: 'new@example.com' }));
    await waitFor(() => expect(screen.queryByLabelText('New email')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
    expect(screen.getByLabelText('New email')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
    expect(screen.queryByLabelText('New email')).toBeNull();
  });
});
