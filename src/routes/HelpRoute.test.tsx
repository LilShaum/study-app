import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelpRoute } from './HelpRoute';
import { WHATS_NEW } from '@/lib/whatsNew';

afterEach(cleanup);

/**
 * The help page's topic links, pinned.
 *
 * They shipped as `<a href="#topic">`, which under a hash router is not an
 * in-page anchor: it rewrites the route, matches nothing, and drops the
 * reader back in the library. The page's own contents list threw you out of
 * the page.
 */
describe('HelpRoute topics', () => {
  it('scrolls to the section instead of navigating away', () => {
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <MemoryRouter initialEntries={['/help']}>
        <HelpRoute />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'Help topics' });
    const topics = [...nav.querySelectorAll('button')];
    expect(topics.length).toBeGreaterThan(2);

    // Nothing in the topic list is a link: a link here is the bug.
    expect(nav.querySelectorAll('a')).toHaveLength(0);

    const target = document.getElementById(
      // Each button's section exists and is focusable, or the jump goes nowhere.
      [...document.querySelectorAll('section[id]')][1]!.id,
    )!;
    target.focus = focus;

    fireEvent.click(topics[1]!);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
  });
});

describe("HelpRoute: what's new and sharing", () => {
  it("lists the newest changes and jumps to them from the version line", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <MemoryRouter initialEntries={['/help']}>
        <HelpRoute />
      </MemoryRouter>,
    );
    const section = document.getElementById('new')!;
    expect(section).toBeTruthy();
    expect(section.textContent).toContain(WHATS_NEW[0]!.items[0]!);

    fireEvent.click(screen.getByRole('button', { name: 'What’s new' }));
    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts[0]).toBe(section);
  });

  it('offers to share the app', () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <HelpRoute />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Share Arborous/ })).toBeTruthy();
  });
});
