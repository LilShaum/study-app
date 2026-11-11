import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { dayKey, useStudyLogStore, type CourseLog } from '@/store/studyLog';
import { useCoursesStore } from '@/store/courses';
import { useProfileStore } from '@/store/profile';
import { RootLayout } from '@/app/RootLayout';
import { AccountRoute } from './AccountRoute';

const ago = (n: number) => dayKey(Date.now() - n * 86400000);
const log = (days: Record<string, number>, extra: Partial<CourseLog> = {}): CourseLog => ({ times: [], answers: [], days, ...extra });
const lecture = (course_code?: string) => ({ schema_version: '1.0', metadata: { title: 'T', course_code }, sections: [] }) as unknown as Course;

const open = () =>
  render(
    <MemoryRouter initialEntries={['/account']}>
      <AccountRoute />
    </MemoryRouter>,
  );

const seed = () => {
  useCoursesStore.setState({ courses: { a: lecture('BIOL 210'), b: lecture('CHEM 101'), c: lecture() } });
  useStudyLogStore.setState({
    byCourse: {
      a: log({ [ago(0)]: 1200, [ago(1)]: 3000, [ago(3)]: 600 }),
      b: log({ [ago(1)]: 900 }),
      c: log({ [ago(2)]: 300 }),
      // Removed, no class kept: under "Removed lectures".
      gone: log({ [ago(20)]: 1800 }, { removed: true }),
      // Removed, its class kept: still counts under BIOL 210 (the owner, 2026-11-11).
      done: log({ [ago(25)]: 600 }, { removed: true, code: 'BIOL 210', title: 'Old lecture' }),
    },
  });
};

afterEach(() => {
  cleanup();
  useStudyLogStore.setState({ byCourse: {} });
  useCoursesStore.setState({ courses: {} });
  useProfileStore.setState({ name: '' });
});

describe('The account page', () => {
  it('with no study yet says the days will fill in, and draws nothing', () => {
    const { container } = open();
    expect(screen.getByRole('link', { name: '← Library' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Account');
    expect(screen.getByText('Your days of study will fill in here as you study.')).toBeTruthy();
    expect(container.querySelector('svg, dl, [data-date]')).toBeNull();
  });

  it('draws the days as leaves, labelled with the summary', () => {
    seed();
    const { container } = open();
    const svg = container.querySelector('svg[role="img"]')!;
    expect(svg.querySelector(`[data-date="${ago(1)}"]`)?.getAttribute('data-level')).toBe('4');
    expect(svg.getAttribute('aria-label')).toMatch(/^Studied \d+ of the last \d+ days/);
  });

  it("shows a tapped day's line", () => {
    seed();
    const { container } = open();
    fireEvent.pointerDown(container.querySelector(`[data-date="${ago(1)}"]`)!);
    expect(screen.getByText(/: 65 minutes, 2 lectures\.$/)).toBeTruthy();
  });

  it('sets the four figures and the time by class, a removed lecture under its class', () => {
    seed();
    open();
    const figures = screen.getByText('Time studied').closest('dl')!;
    expect(within(figures).getByText('Time studied').nextElementSibling?.textContent).toBe('2.3 hours'); // 8400 s
    expect(within(figures).getByText('Days studied').nextElementSibling?.textContent).toBe('6');
    expect(within(figures).getByText('Longest streak').nextElementSibling?.textContent).toBe('4 days');
    expect(within(figures).getByText('Current streak').nextElementSibling?.textContent).toBe('4 days');
    const rows = within(screen.getByRole('heading', { name: 'Time by class' }).parentElement!).getAllByRole('listitem');
    expect(rows.map((r) => [...r.children].map((c) => c.textContent).filter(Boolean))).toEqual([
      ['BIOL 210', '1.5 hours'],
      ['CHEM 101', '15 minutes'],
      ['Other', '5 minutes'],
      ['Removed lectures', '30 minutes'],
    ]);
  });

  it('takes the student’s name for its heading, saved on leaving the field', () => {
    open();
    const field = screen.getByLabelText('Your name');
    fireEvent.change(field, { target: { value: '  Sam ' } });
    fireEvent.blur(field);
    expect(useProfileStore.getState().name).toBe('Sam');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sam');
  });

  it('names itself in the running head, the tab and the footer link', async () => {
    useProfileStore.setState({ name: 'Sam' });
    const router = createMemoryRouter([{ path: '/', element: <RootLayout />, children: [{ path: 'account', element: <AccountRoute /> }] }], {
      initialEntries: ['/account'],
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
    expect(document.title).toBe('Sam · Arborous');
    expect(screen.getByRole('link', { name: 'Sam' }).getAttribute('href')).toBe('/account');
    scrollTo.mockRestore();
  });
});
