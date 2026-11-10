import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BASE_PATH } from '@/lib/basePath';
import { useToastStore } from '@/store/toast';
import { ShareApp } from './ShareApp';

const address = () => window.location.origin + BASE_PATH;

function setNav(props: Record<string, unknown>) {
  for (const [k, v] of Object.entries(props)) {
    Object.defineProperty(navigator, k, { value: v, configurable: true });
  }
}

describe('ShareApp', () => {
  beforeEach(() => useToastStore.setState({ toasts: [] }));
  afterEach(() => {
    cleanup();
    delete (navigator as unknown as Record<string, unknown>).share;
    delete (navigator as unknown as Record<string, unknown>).clipboard;
  });

  it('is folded at first, opens with the code and address, and folds again', async () => {
    render(<ShareApp />);
    const button = screen.getByRole('button', { name: /share arborous/i });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('img')).toBeNull();

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const svg = await screen.findByRole('img', { name: /qr code/i });
    await waitFor(() => expect(svg.querySelector('path')?.getAttribute('d')).toBeTruthy());
    expect(screen.getByText(address())).toBeTruthy();

    fireEvent.click(button);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText(address())).toBeNull();
  });

  it('copies the link and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNav({ clipboard: { writeText } });
    render(<ShareApp />);
    fireEvent.click(screen.getByRole('button', { name: /share arborous/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(address()));
    await waitFor(() =>
      expect(useToastStore.getState().toasts.map((t) => t.message)).toContain('Link copied'),
    );
  });

  it('asks the person to select the address when the clipboard is missing', async () => {
    render(<ShareApp />);
    fireEvent.click(screen.getByRole('button', { name: /share arborous/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() =>
      expect(useToastStore.getState().toasts.map((t) => t.message)).toContain(
        'Select the address above to copy it',
      ),
    );
  });

  it('offers Share only when the browser can, and passes the address', async () => {
    render(<ShareApp />);
    fireEvent.click(screen.getByRole('button', { name: /share arborous/i }));
    expect(screen.queryByRole('button', { name: /^share…/i })).toBeNull();
    cleanup();

    const share = vi.fn().mockResolvedValue(undefined);
    setNav({ share });
    render(<ShareApp />);
    fireEvent.click(screen.getByRole('button', { name: /share arborous/i }));
    fireEvent.click(screen.getByRole('button', { name: /^share…/i }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Arborous', url: address() }));
  });
});
