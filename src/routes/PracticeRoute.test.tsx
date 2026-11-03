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

const choiceIn = (href: string | null) => JSON.parse(new URLSearchParams(href!.split('?')[1]).get('p')!);

describe("a class's Practice: built by ticks", () => {
  it('takes the lectures one after another in order, mixes them when Mixed is picked, and remembers it', () => {
    useCoursesStore.setState({ courses: { a: lecture('MIX 1: Alpha', 'a'), b: lecture('MIX 1: Beta', 'b') } });
    renderAt('/class/MIX%201/practice');
    expect(screen.getByRole('button', { name: 'In order' }).getAttribute('aria-pressed')).toBe('true');
    expect(start()).not.toContain('mix=1');
    expect(start()).toContain('/session/a/practice');
    expect(screen.getByText(/4 cards, starting in Alpha\./)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mixed' }));
    expect(start()).toContain('mix=1');
    expect(screen.getByText(/4 cards, from 2 lectures mixed\./)).toBeTruthy();

    cleanup();
    renderAt('/class/MIX%201/practice');
    expect(screen.getByRole('button', { name: 'Mixed' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('mixes by default in the last week before an exam, and says why', () => {
    const inDays = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const exams = [{ id: 'm2', name: 'Midterm 2', date: inDays(3) }];
    const withExam = (c: Course) => ({ ...c, metadata: { ...c.metadata, exams } }) as Course;
    useCoursesStore.setState({ courses: { a: withExam(lecture('MIX 1: Alpha', 'a')), b: withExam(lecture('MIX 1: Beta', 'b')) } });
    renderAt('/class/MIX%201/practice');
    expect(screen.getByRole('button', { name: 'Mixed' }).getAttribute('aria-pressed')).toBe('true');
    expect(start()).toContain('mix=1');
    expect(screen.getByText(/Mixed because Midterm 2 is in 3 days\./)).toBeTruthy();
  });

  it('ticks whole lectures and single sections in and out, and the count follows', () => {
    useCoursesStore.setState({ courses: { a: lecture('MIX 1: Alpha', 'a'), b: lecture('MIX 1: Beta', 'b') } });
    renderAt('/class/MIX%201/practice');
    fireEvent.click(screen.getByRole('checkbox', { name: /Alpha/ }));
    expect(screen.getByText('2 cards.')).toBeTruthy();
    expect(start()).toContain('/session/b/practice');
    expect(choiceIn(start()).where).toEqual({ a: [], b: 'all' });
    fireEvent.click(screen.getByRole('button', { name: 'Untick all' }));
    expect(screen.getByText('No card matches these ticks.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Start' })).toBeNull();
  });
});

describe("a lecture's Practice", () => {
  const mixed = {
    schema_version: '1.0',
    metadata: { title: 'Kinds' },
    sections: [
      {
        id: 's1',
        title: 'One',
        items: [
          { id: 'q1', type: 'mcq', question: 'Q?', options: ['a', 'b'], correct_index: 0 },
          { id: 'f1', type: 'flashcard', front: 'F?', back: 'b' },
          { id: 'w1', type: 'flashcard', front: 'Write it.', back: '(1) One. (2) Two.' },
        ],
      },
      { id: 's2', title: 'Two', items: [{ id: 'p1', type: 'problem', question: '2 + 2?', answer: 4, steps: ['Add.'] }] },
    ],
  } as unknown as Course;

  it('ticks every kind but written answers by default, and the ticks go to the session', () => {
    useCoursesStore.setState({ courses: { k: mixed } });
    renderAt('/study/k/practice');
    const box = (name: RegExp) => screen.getByRole('checkbox', { name }) as HTMLInputElement;
    expect(box(/^Multiple choice/).checked).toBe(true);
    expect(box(/^Written answers/).checked).toBe(false);
    expect(screen.getByText('3 cards.')).toBeTruthy();
    fireEvent.click(box(/^Written answers/));
    fireEvent.click(box(/^Multiple choice/));
    expect(choiceIn(start()).kinds.sort()).toEqual(['flashcards', 'problems', 'written']);
  });

  it('starts on one section when opened from it', () => {
    useCoursesStore.setState({ courses: { k: mixed } });
    renderAt('/study/k/practice?section=s2');
    expect(screen.getByText('1 card.')).toBeTruthy();
    expect(choiceIn(start()).where).toEqual({ k: ['s2'] });
  });

  it('offers ready-made sittings that start at once', () => {
    useCoursesStore.setState({ courses: { k: mixed } });
    useProgressStore.setState({ byCourse: { k: { q1: { got: 0, missed: 1, lastSeen: 1, stability: 1, lastGot: false } } } });
    renderAt('/study/k/practice');
    const problems = screen.getByRole('link', { name: /^Problems/ }).getAttribute('href');
    expect(choiceIn(problems).kinds).toEqual(['problems']);
    expect(screen.getByRole('link', { name: /^Due now/ })).toBeTruthy();
  });
});
