import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Onboarding } from './Onboarding';
import { useOnboardingStore } from '@/store/onboarding';

afterEach(() => {
  cleanup();
  useOnboardingStore.setState({ onboarded: false });
});

const open = () =>
  render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
  );

describe('the first run', () => {
  it('opens on the tree and the name, and Skip leaves it for good', () => {
    open();
    expect(screen.getByRole('heading', { name: 'Arborous' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(useOnboardingStore.getState().onboarded).toBe(true);
  });

  it('asks the student to grow the tree before going on, not to read about it', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }));
    expect(await screen.findByRole('heading', { name: 'Each branch is one section of a lecture.' })).toBeTruthy();
    // Continue waits until two parts have been studied on the tree itself.
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveProperty('disabled', true);
  });

  it('teaches each thing once: no separate page for finding a section', () => {
    open();
    // title, tree, fade, time, name, account, start (the owner, 2026-11-27:
    // the find page repeated the tree page).
    expect(screen.getByText('1 of 7')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }));
    expect(screen.queryByText(/Sweep across the tree/)).toBeNull();
  });

  it('takes someone with an account straight to signing in', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'I already have an account' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});
