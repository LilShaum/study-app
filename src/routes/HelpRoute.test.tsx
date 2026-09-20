import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelpRoute } from './HelpRoute';

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
