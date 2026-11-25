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

  it('asks the student to grow the tree before going on, not to read about it', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }));
    expect(screen.getByRole('heading', { name: 'Study a part, and it comes into leaf.' })).toBeTruthy();
    // Next waits until two parts have been studied on the tree itself.
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true);
  });

});
