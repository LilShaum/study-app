import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { LibraryRoute } from './LibraryRoute';

const lecture = (title: string) =>
  ({
    schema_version: '1.0',
    metadata: { title },
    sections: [{ id: 's', title: 'S', items: [{ id: 'f', type: 'flashcard', front: 'f?', back: 'b', source_excerpt: 'x' }] }],
  }) as unknown as Course;

const open = (courses: Record<string, Course>) => {
  useCoursesStore.setState({ courses });
  return render(
    <MemoryRouter>
      <LibraryRoute />
    </MemoryRouter>,
  );
};


afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
  useProgressStore.setState({ byCourse: {} });
});

describe("the library's Today, as suggestions (the owner, 2026-11-22)", () => {
  it('suggests what to study, the first struck hardest, each a way to study', () => {
    open({ a: lecture('Alpha'), b: lecture('Beta') });
    const today = screen.getByRole('heading', { name: 'Today' }).parentElement!.parentElement!;
    const learns = within(today).getAllByRole('link', { name: 'Learn' });
    expect(learns).toHaveLength(2);
    expect(learns[0].classList.contains('press-ink')).toBe(true);
    expect(learns[1].classList.contains('press-ink')).toBe(false);
    expect(learns[0].getAttribute('href')).toMatch(/^\/session\/[ab]\/learn$/);
    expect(today.textContent).toContain('not started');
    // No Start over every lecture, no share of a daily time per lecture.
    expect(screen.queryByText(/All 2 lectures/)).toBeNull();
    expect(screen.queryByText('One lecture instead')).toBeNull();
  });

  it('leaves New lecture as the main action when there is nothing to suggest', () => {
    useProgressStore.setState({ byCourse: { a: { f: { got: 1, missed: 0, lastSeen: Date.now() } } } });
    open({ a: lecture('Alpha') });
    expect(screen.queryByRole('heading', { name: 'Today' })).toBeNull();
    expect(screen.getByRole('button', { name: /New lecture/ }).classList.contains('press-ink')).toBe(true);
  });
});

describe('the library list', () => {
  const inClass = (title: string, code: string) => ({ ...lecture(title), metadata: { title, course_code: code } }) as Course;

  it('folds each class under its name, opens it on a tap, and numbers lectures within their class (the owner, 2026-11-22)', () => {
    localStorage.removeItem('arborous:library-open');
    open({ a: inClass('Alpha', 'BIOL 365'), b: inClass('Beta', 'BIOL 365'), c: inClass('Gamma', 'PSYC 351') });
    // Folded: the classes, not their lectures.
    expect(screen.queryByRole('link', { name: /Alpha/ })).toBeNull();
    const fold = (code: RegExp) => screen.getAllByRole('button', { name: code }).find((b) => b.hasAttribute('aria-expanded'))!;
    const biol = fold(/BIOL 365/);
    expect(biol.getAttribute('aria-expanded')).toBe('false');
    expect(biol.textContent).toContain('2 lectures');
    fireEvent.click(biol);
    expect(screen.getByRole('link', { name: /Alpha/ }).textContent).toMatch(/^I[^I]/);
    expect(screen.getByRole('link', { name: /Beta/ }).textContent).toMatch(/^II[^I]/);
    // The other class is still folded, and starts again from I.
    expect(screen.queryByRole('link', { name: /Gamma/ })).toBeNull();
    fireEvent.click(fold(/PSYC 351/));
    expect(screen.getByRole('link', { name: /Gamma/ }).textContent).toMatch(/^I[^I]/);
  });
});
