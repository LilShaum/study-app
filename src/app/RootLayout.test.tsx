import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from './RootLayout';

function setup() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          { index: true, element: <p>the library</p> },
          { path: 'study/:id', element: <p>a lecture</p> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('RootLayout scroll', () => {
  beforeEach(() => {
    // jsdom has no matchMedia; the theme toggle and the welcome ask it.
    window.matchMedia ??= ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => vi.restoreAllMocks());

  // The owner, 2026-11-10: a lecture opened from far down the library
  // landed below its tree, because the window kept the library's scroll.
  it('opens a page from a link at its top', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const router = setup();
    expect(screen.getByText('the library')).toBeTruthy();
    scrollTo.mockClear();

    await act(() => router.navigate('/study/abc'));

    expect(screen.getByText('a lecture')).toBeTruthy();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
