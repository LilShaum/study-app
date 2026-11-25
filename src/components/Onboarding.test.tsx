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
    expect(await screen.findByRole('heading', { name: 'Get a part right, and its branch grows leaves.' })).toBeTruthy();
    // Continue waits until two parts have been studied on the tree itself.
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveProperty('disabled', true);
  });

  it('takes someone with an account straight to signing in', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'I already have an account' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});
