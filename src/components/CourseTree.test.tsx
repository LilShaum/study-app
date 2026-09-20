import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { CourseTree } from './CourseTree';
import type { Course } from '@/schema/course';

const course: Course = {
  schema_version: '1.0',
  metadata: { title: 'Kinetics' },
  sections: [
    {
      id: 'sec-a',
      title: 'Steady state',
      items: [
        { id: 'a1', type: 'mcq', question: 'q', options: ['1', '2', '3', '4'], correct_index: 0, source_excerpt: 'x' },
        { id: 'a2', type: 'flashcard', front: 'f', back: 'b', source_excerpt: 'x' },
      ],
    },
    {
      id: 'sec b/slash',
      title: 'Inhibition',
      items: [{ id: 'b1', type: 'flashcard', front: 'f', back: 'b', source_excerpt: 'x' }],
    },
  ],
} as Course;

const progress = { a1: { got: 3, missed: 1, lastSeen: 1 } };

// CourseTree navigates on a click, so it needs a router around it.
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(cleanup);

describe('CourseTree', () => {
  it('is a picture by default — no links, no tab stops', () => {
    const { container } = render(<CourseTree courseId="c1" course={course} progress={progress} />);
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('img');
  });

  it('gives every section a link into it when interactive', () => {
    render(<CourseTree courseId="c1" course={course} progress={progress} interactive />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '#/study/c1/section/sec-a',
      // Section ids are author-supplied, so anything in one has to survive
      // the trip through the URL.
      '#/study/c1/section/sec%20b%2Fslash',
    ]);
  });

  it('names each link by its section and how it is going', () => {
    render(<CourseTree courseId="c1" course={course} progress={progress} interactive />);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('aria-label'))).toEqual([
      'Steady state — 2 items, 75% correct',
      'Inhibition — 1 item, not yet studied',
    ]);
  });

  it('stops being an image once it holds links', () => {
    const { container } = render(<CourseTree courseId="c1" course={course} progress={progress} interactive />);
    // role="img" would hide the links from a screen reader entirely.
    expect(container.querySelector('svg')?.getAttribute('role')).toBe('group');
  });

  it('keeps every leaf painted after every branch', () => {
    // The limbs are grouped by section so a section can swing aside as a
    // unit, and grouping is exactly what could undo this: one section's
    // branches would land back on top of another's leaves. Document order
    // across the whole drawing is what decides paint order.
    const { container } = render(<CourseTree courseId="c1" course={course} progress={progress} interactive />);
    const painted = [...container.querySelectorAll('path')];
    const isLeaf = (el: Element) => el.classList.contains('lf');
    const lastWood = painted.reduce((last, el, i) => (isLeaf(el) ? last : i), -1);
    const firstLeaf = painted.findIndex(isLeaf);
    expect(firstLeaf).toBeGreaterThan(lastWood);
  });

  it('groups each section so it can move as one', () => {
    const { container } = render(<CourseTree courseId="c1" course={course} progress={progress} interactive />);
    const sets = [...container.querySelectorAll('g.limb-set')];
    // One wood group and one foliage group per section that has both.
    expect(sets.length).toBeGreaterThanOrEqual(2);
    // Every group turns about a point on the tree, not about the page.
    for (const set of sets) {
      expect((set as SVGElement).style.transformOrigin).toMatch(/\d/);
    }
  });

  it('expands rather than navigating when it is a preview', () => {
    const onExpand = vi.fn();
    const { container } = render(
      <CourseTree courseId="c1" course={course} progress={progress} interactive mode="preview" onExpand={onExpand} />,
    );
    fireEvent.click(container.querySelector('svg')!);
    // At thumbnail size a click cannot reliably pick one limb among
    // interleaved crowns, so it opens the drawing instead of guessing.
    expect(onExpand).toHaveBeenCalled();
  });

  it('dims the other sections while one is highlighted', () => {
    const { container } = render(
      <CourseTree courseId="c1" course={course} progress={progress} interactive highlight="sec-a" />,
    );
    const dimmed = [...container.querySelectorAll('path[opacity]')];
    expect(dimmed.length).toBeGreaterThan(0);
    // The bole and the leader belong to no section and must never dim.
    expect(container.querySelectorAll('path').length).toBeGreaterThan(dimmed.length);
  });
});
