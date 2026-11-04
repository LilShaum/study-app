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
    expect(screen.getByText('Least accurate sections')).toBeTruthy();
    // Twice: once in "Still remembered", once in the accuracy ranking.
    expect(screen.getAllByText('Membranes')).toHaveLength(2);
    expect(screen.getByText('Still remembered')).toBeTruthy();
  });

  it('leads with what is fading, each with its Review, and folds the accuracy below it', () => {
    useCoursesStore.setState({ courses: { cell_biology: course } });
    useProgressStore.setState({
      byCourse: { cell_biology: { q1: { got: 1, missed: 0, lastSeen: Date.now() - 30 * 86_400_000 } } },
    });

    renderProgress();

    const fading = screen.getByText('Still remembered');
    const fold = screen.getByText('How well you answered ▸').closest('details')!;
    // Fading comes first in the page, and is not inside the fold.
    expect(fading.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fading.closest('details')).toBeNull();
    expect(screen.getByRole('link', { name: 'Review 1' }).getAttribute('href')).toBe('/session/cell_biology/review?section=s1');
    // The accuracy and the tags are closed, and all still there.
    expect(fold.open).toBe(false);
    for (const label of ['Accuracy', 'Least accurate sections', 'Least accurate tags']) {
      expect(screen.getByText(label).closest('details')).toBe(fold);
    }
  });

  it('handles a course id that does not exist', () => {
    expect(() => renderProgress('nope')).not.toThrow();
    expect(screen.getByText(/Lecture not found/)).toBeTruthy();
  });
});
