import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { ProgressRoute } from './ProgressRoute';

const course = {
  schema_version: '1.0',
  metadata: { title: 'Cell Biology' },
  sections: [
    {
      id: 's1',
      title: 'Membranes',
      items: [
        { id: 'q1', type: 'mcq', question: 'q', options: ['a', 'b'], correct_index: 0, tags: ['membrane'] },
        { id: 'f1', type: 'flashcard', front: 'f', back: 'b', tags: ['membrane'] },
      ],
    },
  ],
} as unknown as Course;

function renderProgress(id = 'cell_biology') {
  return render(
    <MemoryRouter initialEntries={[`/study/${id}/progress`]}>
      <Routes>
        <Route path="/study/:id/progress" element={<ProgressRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
  useProgressStore.setState({ byCourse: {} });
});

describe('ProgressRoute', () => {
  /**
   * Regression test for the bug this rebuild actually shipped: getProgress()
   * returned a fresh `{}` for any course with no recorded progress, so
   * useSyncExternalStore saw a new snapshot on every check and the component
   * looped until React threw "Maximum update depth exceeded". The empty state
   * below was unreachable in production, and it's the state a new user hits
   * first — which is exactly why clicking through populated screens missed it.
   */
  it('renders the empty state instead of crashing when no progress is recorded', () => {
    useCoursesStore.setState({ courses: { cell_biology: course } });

    expect(() => renderProgress()).not.toThrow();
    expect(screen.getByText('No progress yet')).toBeTruthy();
  });

  it('renders stats once progress exists', () => {
    useCoursesStore.setState({ courses: { cell_biology: course } });
    useProgressStore.setState({
      byCourse: { cell_biology: { q1: { got: 3, missed: 1, lastSeen: Date.now() } } },
    });

    renderProgress();

    // 75% legitimately appears twice — the accuracy tile and the section bar.
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
    expect(screen.getByText('Accuracy')).toBeTruthy();
    expect(screen.getByText('Weakest sections')).toBeTruthy();
    expect(screen.getByText('Membranes')).toBeTruthy();
  });

  it('handles a course id that does not exist', () => {
    expect(() => renderProgress('nope')).not.toThrow();
    expect(screen.getByText(/Course not found/)).toBeTruthy();
  });
});
