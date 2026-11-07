import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { CourseTree, LimbPaths } from './CourseTree';
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
      'Steady state: 2 items, 75% correct',
      'Inhibition: 1 item, not yet studied',
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

  it('dims the other sections as a group, writing nothing on the paths', () => {
    const { container } = render(<CourseTree courseId="c1" course={course} progress={progress} interactive highlight="sec-a" />);
    const dimmed = [...container.querySelectorAll('g[data-dim]')];
    expect(dimmed.length).toBeGreaterThan(0);
    expect(dimmed.every((g) => g.getAttribute('data-sid') !== 'sec-a')).toBe(true);
    // An opacity on every stroke darkened wherever two strokes crossed: a dot
    // at each joint and the leaves a grey scribble. The ink is the group's.
    expect(container.querySelectorAll('path[opacity]')).toHaveLength(0);
    // The bole belongs to no section and never dims.
    expect(container.querySelector('path.ink')!.closest('[data-dim]')).toBeNull();
  });

  it('draws the picked branch again in front of every leaf, and only that one', () => {
    const { container } = render(<CourseTree courseId="c1" course={course} progress={progress} interactive highlight="sec-a" />);
    const fronts = [...container.querySelectorAll('g[data-front]')];
    // Every section has its group in front, so a pick never has to make one.
    expect(fronts.map((g) => g.getAttribute('data-front'))).toEqual(['sec-a', 'sec b/slash']);
    const filled = fronts.filter((g) => g.querySelector('path'));
    expect(filled.map((g) => g.getAttribute('data-front'))).toEqual(['sec-a']);
    // After every leaf in the drawing, and swinging with its section below.
    const painted = [...container.querySelectorAll('path')];
    const lastLeafBelow = painted.reduce((last, el, i) => (el.classList.contains('lf') && !el.closest('[data-front]') ? i : last), -1);
    expect(painted.indexOf(filled[0].querySelector('path')!)).toBeGreaterThan(lastLeafBelow);
    const below = container.querySelector('g.limb-set[data-sid="sec-a"]') as SVGElement;
    expect((filled[0] as SVGElement).style.transform).toBe(below.style.transform);
    // Not a target, and not read out twice.
    expect(filled[0].querySelector('[data-section]')).toBeNull();
    expect(filled[0].closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('draws nothing in front with no branch picked', () => {
    const { container } = render(<CourseTree courseId="c1" course={course} progress={progress} interactive />);
    expect(container.querySelectorAll('g[data-front] path')).toHaveLength(0);
  });

  it('leaves the paths of a section alone when another is picked', () => {
    const tree = (highlight: string) => (
      <MemoryRouter>
        <CourseTree courseId="c1" course={course} progress={progress} highlight={highlight} />
      </MemoryRouter>
    );
    const { container, rerender } = rtlRender(tree('sec b/slash'));
    const paths = () => [...container.querySelectorAll('g[data-sid="sec b/slash"] path')].map((el) => el.outerHTML);
    const picked = paths();
    rerender(tree('sec-a'));
    const before = paths();
    rerender(tree('sec-a'));
    // Dimming is the group's ink, so a branch that is not picked keeps the
    // same paths whichever other one is; kept apart in a memo, React skips
    // them, and a change of branch re-renders only the branch left and the
    // branch picked (it re-rendered the whole drawing on every move).
    expect(paths()).toEqual(before);
    expect(picked).not.toEqual(before);
    expect((LimbPaths as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });

  it('starts the sheet at the crown when cropped', () => {
    const { container } = render(<CourseTree courseId="c1" course={course} progress={progress} crop />);
    const [, top] = container.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number);
    expect(top).toBeGreaterThan(0);
  });
});

describe('CourseTree on the lecture page (reveal)', () => {
  const svgOf = (c: HTMLElement) => c.querySelector('svg')!;
  const shown = (c: HTMLElement) => c.querySelector('.tree-keys')!.hasAttribute('data-shown');
  const numbers = () => screen.getAllByRole('link', { name: /^Section \d/ });
  const touch = (svg: Element, type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel', x = 300, y = 300) =>
    fireEvent[type](svg, { pointerType: 'touch', clientX: x, clientY: y });
  const tap = (svg: Element) => {
    touch(svg, 'pointerDown');
    touch(svg, 'pointerUp');
    fireEvent.click(svg, { detail: 1, clientX: 300, clientY: 300 });
  };
  const show = (extra: { onExpand?: () => void; onPoint?: (id: string | null) => void } = {}) =>
    render(<CourseTree courseId="c1" course={course} progress={progress} interactive mode="reveal" {...extra} />);

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the drawing alone until touched: the numbers there, down and out of the tab order', () => {
    const { container } = show();
    expect(shown(container)).toBe(false);
    expect(numbers().map((a) => a.getAttribute('tabindex'))).toEqual(['-1', '-1']);
    expect(numbers().map((a) => a.getAttribute('href'))).toEqual(['#/study/c1/section/sec-a', '#/study/c1/section/sec%20b%2Fslash']);
  });

  it('raises the numbers on the first tap, which no longer opens the large tree; a tap on the drawing then does', () => {
    const onExpand = vi.fn();
    const { container } = show({ onExpand });
    tap(svgOf(container));
    expect(shown(container)).toBe(true);
    expect(onExpand).not.toHaveBeenCalled();
    tap(svgOf(container));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('raises them for a press held a moment', () => {
    const { container } = show();
    touch(svgOf(container), 'pointerDown');
    expect(shown(container)).toBe(false);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(shown(container)).toBe(true);
  });

  it('raises them at once for a sideways swipe', () => {
    const { container } = show();
    touch(svgOf(container), 'pointerDown', 100, 300);
    touch(svgOf(container), 'pointerMove', 130, 302);
    expect(shown(container)).toBe(true);
  });

  it('raises nothing for a drag up or down: that is the page scrolling', () => {
    const { container } = show();
    touch(svgOf(container), 'pointerDown', 200, 300);
    touch(svgOf(container), 'pointerMove', 202, 260);
    touch(svgOf(container), 'pointerCancel', 202, 200);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(shown(container)).toBe(false);
    expect(svgOf(container).style.touchAction).toBe('pan-y');
  });

  it('puts them away a few seconds after the finger lifts', () => {
    const { container } = show();
    tap(svgOf(container));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(shown(container)).toBe(true);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(shown(container)).toBe(false);
  });

  it('raises them for the keyboard, lets Tab reach each number, and Escape puts them away', () => {
    const { container } = show();
    fireEvent.focus(svgOf(container));
    expect(shown(container)).toBe(true);
    expect(numbers().map((a) => a.getAttribute('tabindex'))).toEqual(['0', '0']);
    fireEvent.keyDown(svgOf(container), { key: 'Escape' });
    expect(shown(container)).toBe(false);
  });

  it('takes no focus from a finger or a mouse, so no ring is drawn round the picture', () => {
    const { container } = show();
    expect(fireEvent.mouseDown(svgOf(container))).toBe(false);
  });

  it('opens the large tree from the keyboard with Enter on the drawing', () => {
    const onExpand = vi.fn();
    const { container } = show({ onExpand });
    fireEvent.keyDown(svgOf(container), { key: 'Enter' });
    expect(onExpand).toHaveBeenCalled();
  });

  it('carries each number in its branch: one transform moves both', () => {
    const onPoint = vi.fn();
    const { container } = show({ onPoint });
    fireEvent.focus(numbers()[0]);
    expect(onPoint).toHaveBeenLastCalledWith('sec-a');
    for (const key of container.querySelectorAll('.tree-keys g[data-sid]')) {
      const sid = key.getAttribute('data-sid')!;
      const wood = [...container.querySelectorAll('g.limb-set')].find((g) => g.getAttribute('data-sid') === sid && !g.closest('.tree-keys')) as SVGElement;
      expect((key as SVGElement).style.transform).toBe(wood.style.transform);
      expect((key as SVGElement).style.transformOrigin).toBe(wood.style.transformOrigin);
    }
    // The other branch swung aside, so the check above compared something.
    const other = [...container.querySelectorAll('.tree-keys g[data-sid]')].find((g) => g.getAttribute('data-sid') === 'sec b/slash') as SVGElement;
    expect(other.style.transform).not.toBe('rotate(0deg)');
  });
});
