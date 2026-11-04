import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { useResumeStore } from '@/store/resume';
import { useSessionStore } from '@/store/session';
import { SessionRoute } from '@/routes/SessionRoute';

const DAY = 86_400_000;

const lecture = (title: string) =>
  ({
    schema_version: '1.0',
    metadata: { title },
    sections: [
      {
        id: 's1',
        title: 'One',
        items: ['f1', 'f2'].map((id) => ({ id, type: 'flashcard', front: `${title} ${id}?`, back: `${title} ${id}.`, source_excerpt: 'x' })),
      },
    ],
  }) as unknown as Course;

/** Two lectures with their cards long since faded, so each has a Today; answered to its end. */
function finishToday(path: string) {
  const faded = { got: 1, missed: 0, lastSeen: Date.now() - 30 * DAY };
  useCoursesStore.setState({ courses: { a: lecture('Alpha'), b: lecture('Beta') } });
  useProgressStore.setState({ byCourse: { a: { f1: faded, f2: faded }, b: { f1: faded, f2: faded } } });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/session/:id/:mode" element={<SessionRoute />} />
      </Routes>
    </MemoryRouter>,
  );
  for (let k = 0; k < 10 && !useSessionStore.getState().finished; k++) {
    fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  }
  expect(useSessionStore.getState().finished).toBe(true);
}

afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
  useProgressStore.setState({ byCourse: {} });
  useResumeStore.setState({ byCourse: {} });
});

describe("the end of a Today sitting (the library's two Starts)", () => {
  it("carries on to the next lecture from the day's Start", () => {
    finishToday('/session/a/today');
    expect(screen.getByRole('link', { name: 'Next: Today in Beta' }).getAttribute('href')).toBe('/session/b/today');
  });

  it('stops in the lecture that was asked for alone', () => {
    finishToday('/session/a/today?single=1');
    expect(screen.queryByRole('link', { name: /Next: Today/ })).toBeNull();
  });
});
