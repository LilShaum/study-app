import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { TestRoute } from './TestRoute';

// Made up: no course material in the repo.
const lecture = {
  schema_version: '1.0',
  metadata: { title: 'Made up' },
  sections: [
    {
      id: 's1',
      title: 'One',
      items: [1, 2, 3].map((n) => ({
        id: `q${n}`,
        type: 'mcq',
        question: `Question ${n}?`,
        options: [`right ${n}`, `wrong ${n}a`, `wrong ${n}b`, `wrong ${n}c`],
        correct_index: 0,
        explanation: `Because ${n}.`,
        distractor_rationale: ['', `not ${n}a`, `not ${n}b`, `not ${n}c`],
        difficulty: 'medium',
        source_excerpt: `passage ${n}`,
      })),
    },
  ],
} as unknown as Course;

function open() {
  useCoursesStore.setState({ courses: { c: lecture } });
  return render(
    <MemoryRouter initialEntries={['/study/c/test']}>
      <Routes>
        <Route path="/study/:id/test" element={<TestRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  useCoursesStore.setState({ courses: {} });
  useProgressStore.setState({ byCourse: {} });
});

describe('practice test: a rehearsal, answers at the end', () => {
  it('marks nothing until the end, lets an answer be changed, then gives the score and why', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Start the test' }));
    const radios = () => screen.getAllByRole('radio');
    fireEvent.click(radios().find((b) => /wrong/.test(b.textContent ?? ''))!);
    expect(screen.queryByText(/Not this time|Correct/)).toBeNull();
    fireEvent.click(radios().find((b) => /right/.test(b.textContent ?? ''))!);
    expect(radios().find((b) => /right/.test(b.textContent ?? ''))!.getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByText(/Correct/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(radios().find((b) => /wrong/.test(b.textContent ?? ''))!);
    fireEvent.click(screen.getByRole('button', { name: 'End and see my score' }));
    // One left blank: looked over before it is handed in.
    expect(screen.getByText('1 not answered.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'End and see my score' }));
    expect(screen.getByText('1 of 3')).toBeTruthy();
    expect(screen.getByText('What you missed')).toBeTruthy();
    expect(screen.getAllByText(/^not \d[abc]$/).length).toBeGreaterThan(0);
  });

  it('turns to any question, marks one to come back to, and shows what is open before handing in', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Start the test' }));
    const radios = () => screen.getAllByRole('radio');
    const shownQuestion = () => Number(screen.getByText(/^Question \d\?$/).textContent!.match(/\d/)![0]);
    // Answer the first, mark it, then turn straight to the third.
    const first = shownQuestion();
    fireEvent.click(radios()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Mark to come back to' }));
    expect(screen.getByRole('button', { name: 'Marked to come back to' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /^Question 1 of 3/ }));
    expect(screen.getByRole('button', { name: 'Question 1, answered, marked to come back to' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Question 3, not answered' }));
    expect(screen.getByText(/^Question 3 of 3/)).toBeTruthy();
    expect(shownQuestion()).not.toBe(first);
    // Ending: what is still open, and a way back to it.
    fireEvent.click(screen.getByRole('button', { name: 'End and see my score' }));
    expect(screen.getByText('2 not answered · 1 marked to come back to.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Question 1, answered, marked to come back to' }));
    expect(screen.getByText(/^Question 1 of 3/)).toBeTruthy();
    expect(shownQuestion()).toBe(first);
    fireEvent.click(screen.getByRole('button', { name: 'Marked to come back to' }));
    fireEvent.click(screen.getByRole('button', { name: 'End and see my score' }));
    expect(screen.getByText('2 not answered.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the test' }));
    expect(screen.getByText(/^Question 1 of 3/)).toBeTruthy();
  });

  it('lists a right answer still marked ? with its why, as not sure', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Start the test' }));
    const radios = () => screen.getAllByRole('radio');
    for (let n = 0; n < 3; n++) {
      fireEvent.click(radios().find((b) => /right/.test(b.textContent ?? ''))!);
      if (n === 0) fireEvent.click(screen.getByRole('button', { name: 'Mark to come back to' }));
      fireEvent.click(screen.getByRole('button', { name: n < 2 ? 'Next' : 'See my score' }));
    }
    // Marked: looked over first, then handed in.
    fireEvent.click(screen.getByRole('button', { name: 'End and see my score' }));
    expect(screen.getByText('3 of 3')).toBeTruthy();
    expect(screen.getByText('Right, but marked ?')).toBeTruthy();
  });

  it('points to Practice for marking as you go', () => {
    open();
    expect(screen.getByRole('link', { name: 'That is Practice' }).getAttribute('href')).toBe('/study/c/practice');
    expect(screen.queryByRole('button', { name: 'As you go' })).toBeNull();
  });

  it('ends and is marked when the time set runs out', () => {
    vi.useFakeTimers();
    try {
      open();
      fireEvent.click(screen.getByRole('button', { name: 'Timed' }));
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1' } });
      fireEvent.click(screen.getByRole('button', { name: 'Start the test' }));
      expect(screen.getByRole('timer').textContent).toMatch(/1:00 left|0:5\d left/);
      act(() => {
        vi.advanceTimersByTime(61_000);
      });
      expect(screen.getByText('0 of 3')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('practice test: adaptive', () => {
  it('asks first what was last got wrong, and says so', () => {
    useProgressStore.setState({ byCourse: { c: { q2: { got: 0, missed: 1, lastSeen: 1, lastGot: false, testedAt: 1 }, q3: { got: 1, missed: 0, lastSeen: 1, lastGot: true, testedAt: 1 } } } });
    open();
    expect(screen.getByText(/A new test asks first the 1 you last got wrong or didn’t know, then 1 not on a test yet\./)).toBeTruthy();
  });
});

describe('practice test: what goes on it', () => {
  const withWritten = {
    ...lecture,
    sections: [{ ...lecture.sections[0], items: [...lecture.sections[0].items, { id: 'w', type: 'flashcard', front: 'Explain it.', back: '(1) One. (2) Two.', difficulty: 'medium' }] }],
  } as unknown as Course;

  it('is multiple choice alone unless written answers are ticked', () => {
    useCoursesStore.setState({ courses: { c: withWritten } });
    open();
    useCoursesStore.setState({ courses: { c: withWritten } });
    cleanup();
    render(
      <MemoryRouter initialEntries={['/study/c/test']}>
        <Routes>
          <Route path="/study/:id/test" element={<TestRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    expect((screen.getByRole('checkbox', { name: /Multiple choice/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('button', { name: 'All 3' })).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: /Written answers/ }));
    expect(screen.getByRole('button', { name: 'All 4' })).toBeTruthy();
  });
});

describe('practice test: problems to work out', () => {
  const withProblems = {
    ...lecture,
    sections: [
      {
        ...lecture.sections[0],
        items: [
          ...lecture.sections[0].items,
          { id: 'p1', type: 'problem', question: 'A 2 kg cart accelerates at 3 m/s². What force acts on it?', answer: 6, unit: 'N', steps: ['F = ma.', '2 × 3 = 6 N.'], mistakes: [{ answer: 1.5, why: 'Divided instead of multiplied.' }], difficulty: 'easy', source_excerpt: 'F = ma' },
        ],
      },
    ],
  } as unknown as Course;

  function openWith() {
    useCoursesStore.setState({ courses: { c: withProblems } });
    return render(
      <MemoryRouter initialEntries={['/study/c/test']}>
        <Routes>
          <Route path="/study/:id/test" element={<TestRoute />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  /** On to the problem: the other questions skipped. */
  function toProblem() {
    for (let n = 0; n < 5 && !screen.queryByLabelText('Your answer, in N'); n++) fireEvent.click(screen.getByRole('button', { name: /Skip|Next/ }));
  }

  it('takes problems when ticked, asks for a number it can read, and marks it at the end with the mistake behind it', () => {
    openWith();
    fireEvent.click(screen.getByRole('checkbox', { name: /Problems/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Multiple choice/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start the test' }));
    toProblem();
    const box = screen.getByLabelText('Your answer, in N');
    fireEvent.change(box, { target: { value: 'six' } });
    fireEvent.submit(box.closest('form')!);
    expect(screen.getByText('Type the answer as a number, in N.')).toBeTruthy();
    fireEvent.change(box, { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: /See my score|Finish/ }));
    expect(screen.getByText('0 of 1')).toBeTruthy();
    expect(screen.getByText(/Divided instead of multiplied/)).toBeTruthy();
    expect(screen.getByText('✓ 6 N')).toBeTruthy();
  });
});
