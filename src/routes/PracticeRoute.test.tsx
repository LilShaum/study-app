import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { PracticeRoute } from './PracticeRoute';

// Made-up lectures: no course material in the repo.
const lecture = (title: string, prefix: string) =>
  ({
    schema_version: '1.0',
    metadata: { title, course_code: 'MIX 1' },
    sections: [
      {
        id: 's1',
        title: 'One',
        items: [1, 2].map((n) => ({ id: `${prefix}${n}`, type: 'mcq', question: `${title} ${n}?`, options: ['a', 'b'], correct_index: 0, explanation: 'x' })),
      },
    ],
  }) as unknown as Course;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/study/:id/practice" element={<PracticeRoute />} />
        <Route path="/class/:code/practice" element={<PracticeRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

const start = () => screen.getByRole('link', { name: 'Start' }).getAttribute('href');

afterEach(() => {
  cleanup();
  localStorage.clear();
  useCoursesStore.setState({ courses: {} });
  useProgressStore.setState({ byCourse: {} });
});

describe("a class's Practice: one lecture at a time, or mixed", () => {
  it('takes the lectures one at a time unless mixing is chosen, and remembers the choice', () => {
    useCoursesStore.setState({ courses: { a: lecture('MIX 1: Alpha', 'a'), b: lecture('MIX 1: Beta', 'b') } });
    renderAt('/class/MIX%201/practice');
    expect(screen.getByRole('button', { name: 'One at a time' }).getAttribute('aria-pressed')).toBe('true');
    expect(start()).not.toContain('mix=1');
    expect(screen.getByText(/then carries on through 1 more lecture\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mixed together' }));
    expect(start()).toContain('mix=1');
    expect(screen.getByText(/Cards from 2 lectures in one sitting, mixed together/)).toBeTruthy();

    cleanup();
    renderAt('/class/MIX%201/practice');
    expect(screen.getByRole('button', { name: 'Mixed together' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('mixes by default in the last week before an exam, says why, and keeps a pick made then', () => {
    const inDays = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const exams = [{ id: 'm2', name: 'Midterm 2', date: inDays(3) }];
    const withExam = (c: Course) => ({ ...c, metadata: { ...c.metadata, exams } }) as Course;
    useCoursesStore.setState({ courses: { a: withExam(lecture('MIX 1: Alpha', 'a')), b: withExam(lecture('MIX 1: Beta', 'b')) } });
    // What the page saved before picks were kept apart: the old default, not a pick.
    localStorage.setItem('arborous:practice:class:MIX 1', JSON.stringify({ cards: null, kind: 'all', from: '', lectures: 'in-turn' }));
    renderAt('/class/MIX%201/practice');
    expect(screen.getByRole('button', { name: 'Mixed together' }).getAttribute('aria-pressed')).toBe('true');
    expect(start()).toContain('mix=1');
    expect(screen.getByText(/Mixed because Midterm 2 is in 3 days\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'One at a time' }));
    expect(start()).not.toContain('mix=1');
    cleanup();
    renderAt('/class/MIX%201/practice');
    expect(screen.getByRole('button', { name: 'One at a time' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('offers no mixing for one lecture of the class, or on a lecture\'s own Practice', () => {
    useCoursesStore.setState({ courses: { a: lecture('MIX 1: Alpha', 'a'), b: lecture('MIX 1: Beta', 'b') } });
    renderAt('/study/a/practice');
    expect(screen.queryByRole('button', { name: 'Mixed together' })).toBeNull();
    cleanup();

    renderAt('/class/MIX%201/practice');
    fireEvent.click(screen.getByRole('button', { name: 'Mixed together' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lecture:b' } });
    expect(screen.queryByRole('button', { name: 'Mixed together' })).toBeNull();
    expect(start()).not.toContain('mix=1');
  });

  it('offers mixing only when the cards chosen are in more than one lecture', () => {
    useCoursesStore.setState({ courses: { a: lecture('MIX 1: Alpha', 'a'), b: lecture('MIX 1: Beta', 'b') } });
    // Only Alpha has a card due.
    useProgressStore.setState({ byCourse: { a: { a1: { got: 1, missed: 0, lastSeen: Date.now() - 20 * 864e5 } } } });
    renderAt('/class/MIX%201/practice');
    expect(screen.getByRole('button', { name: /^Due now/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Mixed together' })).toBeNull();
    expect(start()).toContain('single=1');
    fireEvent.click(screen.getByRole('button', { name: /^Everything/ }));
    expect(screen.getByRole('button', { name: 'Mixed together' })).toBeTruthy();
  });
});
