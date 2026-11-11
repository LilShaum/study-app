import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { dayKey, useStudyLogStore, type CourseLog } from '@/store/studyLog';
import { useCoursesStore } from '@/store/courses';
import { RootLayout } from '@/app/RootLayout';
import { DaysRoute } from './DaysRoute';

const ago = (n: number) => dayKey(Date.now() - n * 86400000);
const log = (days: Record<string, number>, removed?: boolean): CourseLog => ({ times: [], answers: [], days, ...(removed ? { removed } : {}) });
const lecture = (course_code?: string) => ({ schema_version: '1.0', metadata: { title: 'T', course_code }, sections: [] }) as unknown as Course;

const open = (look?: string) =>
  render(
    <MemoryRouter initialEntries={[`/days${look ? `?look=${look}` : ''}`]}>
      <DaysRoute />
    </MemoryRouter>,
  );

const seed = () => {
  useCoursesStore.setState({ courses: { a: lecture('BIOL 210'), b: lecture('CHEM 101'), c: lecture() } });
  useStudyLogStore.setState({
    byCourse: {
      a: log({ [ago(0)]: 1200, [ago(1)]: 3000, [ago(3)]: 600 }),
      b: log({ [ago(1)]: 900 }),
      c: log({ [ago(2)]: 300 }),
      gone: log({ [ago(20)]: 1800 }, true),
    },
  });
};

afterEach(() => {
  cleanup();
  useStudyLogStore.setState({ byCourse: {} });
  useCoursesStore.setState({ courses: {} });
});

describe('Days of study', () => {
  it('with no study yet says the days will fill in, and nothing else', () => {
    const { container } = open();
    expect(screen.getByRole('link', { name: '← Library' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Days of study');
    expect(screen.getByText('Your days of study will fill in here as you study.')).toBeTruthy();
    expect(container.querySelector('svg, dl, [data-date]')).toBeNull();
    // Under a minute is not a day of study.
    useStudyLogStore.setState({ byCourse: { a: log({ [ago(0)]: 30 }) } });
    cleanup();
    expect(open().container.querySelector('[data-date]')).toBeNull();
  });

  it.each(['green', 'leaves', undefined, 'nonsense'])('draws the week grid for look=%s', (look) => {
    seed();
    const { container } = open(look);
    const svg = container.querySelector('svg[role="img"]')!;
    expect(svg.getAttribute('data-look')).toBe(look === 'leaves' ? 'leaves' : 'green');
    expect(svg.querySelector(`[data-date="${ago(1)}"]`)?.getAttribute('data-level')).toBe('4');
    expect(svg.getAttribute('aria-label')).toMatch(/^Studied \d+ of the last \d+ days/);
  });

  it('draws the calendar look as months, newest first', () => {
    seed();
    const { container } = open('calendar');
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    const months = container.querySelectorAll('[data-look="calendar"] section');
    expect(months.length).toBeGreaterThanOrEqual(1);
    const now = new Date();
    expect(months[0].getAttribute('aria-label')).toBe(new Intl.DateTimeFormat('en', { month: 'long' }).format(now));
    expect(container.querySelector(`[data-date="${ago(1)}"]`)?.className).toContain('bg-heat-4');
    expect(container.querySelector(`[data-date="${ago(0)}"]`)?.className).toContain('outline-accent');
  });

  it("shows a tapped day's line in each look", () => {
    for (const look of ['green', 'leaves', 'calendar']) {
      seed();
      const { container, unmount } = open(look);
      fireEvent.pointerDown(container.querySelector(`[data-date="${ago(1)}"]`)!);
      expect(screen.getByText(/: 65 minutes, 2 lectures\.$/)).toBeTruthy();
      unmount();
    }
  });

  it('sets the four figures as a ruled label and the time by class, most first', () => {
    seed();
    open();
    const figures = screen.getByText('Time studied').closest('dl')!;
    expect(within(figures).getByText('Time studied').nextElementSibling?.textContent).toBe('2.2 hours'); // 7800 s
    expect(within(figures).getByText('Days studied').nextElementSibling?.textContent).toBe('5');
    expect(within(figures).getByText('Longest streak').nextElementSibling?.textContent).toBe('4 days');
    expect(within(figures).getByText('Current streak').nextElementSibling?.textContent).toBe('4 days');
    const rows = within(screen.getByRole('heading', { name: 'Time by class' }).parentElement!).getAllByRole('listitem');
    // Classes by time, then the lectures with no code, then those removed.
    expect(rows.map((r) => [...r.children].map((c) => c.textContent).filter(Boolean))).toEqual([
      ['BIOL 210', '1.3 hours'],
      ['CHEM 101', '15 minutes'],
      ['Other', '5 minutes'],
      ['Removed lectures', '30 minutes'],
    ]);
  });

  it('names itself in the running head and the tab', async () => {
    seed();
    const router = createMemoryRouter([{ path: '/', element: <RootLayout />, children: [{ path: 'days', element: <DaysRoute /> }] }], {
      initialEntries: ['/days'],
    });
    window.matchMedia ??= ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    await act(async () => {
      render(<RouterProvider router={router} />);
    });
    expect(document.title).toBe('Days of study · Arborous');
    scrollTo.mockRestore();
  });
});
