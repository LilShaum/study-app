import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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

const starts = () => screen.getAllByRole('link', { name: 'Start' });

afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
  useProgressStore.setState({ byCourse: {} });
});

describe("the library's Today", () => {
  it('has one Start for the day, struck hardest, across every lecture', () => {
    open({ a: lecture('Alpha'), b: lecture('Beta') });
    const inked = starts().filter((s) => s.classList.contains('press-ink'));
    expect(inked).toHaveLength(1);
    // No "?single": this one carries on through the rest.
    expect(inked[0].getAttribute('href')).toMatch(/^\/session\/[ab]\/today$/);
    expect(inked[0].closest('li')!.textContent).toContain('All 2 lectures');
    expect(inked[0].closest('li')!.textContent).toMatch(/Starts with (Alpha|Beta)\./);
  });

  it('keeps a row for each lecture below it, for the day a student wants one alone', () => {
    open({ a: lecture('Alpha'), b: lecture('Beta') });
    const rows = screen.getByRole('heading', { name: 'One lecture instead' }).nextElementSibling as HTMLElement;
    const links = within(rows).getAllByRole('link', { name: 'Start' });
    expect(links.map((l) => l.getAttribute('href')).sort()).toEqual(['/session/a/today?single=1', '/session/b/today?single=1']);
    expect(within(rows).getByText('Alpha')).toBeTruthy();
    expect(within(rows).getByText('Beta')).toBeTruthy();
  });

  it('with one lecture left to study today, makes its own row the day: nothing to add up or choose', () => {
    // Beta answered and still fresh: nothing due, nothing new.
    useProgressStore.setState({ byCourse: { b: { f: { got: 2, missed: 0, lastSeen: Date.now(), stability: 30 } } } });
    open({ a: lecture('Alpha'), b: lecture('Beta') });
    const all = starts();
    expect(all).toHaveLength(1);
    expect(all[0].getAttribute('href')).toBe('/session/a/today');
    expect(all[0].classList.contains('press-ink')).toBe(true);
    expect(screen.queryByText('One lecture instead')).toBeNull();
    expect(screen.queryByText(/^All \d+ lectures$/)).toBeNull();
  });

  it('leaves New lecture as the main action when there is no day to start', () => {
    open({ a: lecture('Alpha') });
    expect(screen.queryByRole('link', { name: 'Start' })).toBeNull();
    expect(screen.getByRole('button', { name: 'New lecture' }).classList.contains('press-ink')).toBe(true);
  });
});
