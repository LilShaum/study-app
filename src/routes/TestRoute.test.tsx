import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

describe('practice test: marked as you answer', () => {
  it('says right or wrong as soon as an option is picked, with why, and keeps the answer', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Start the test' }));
    const wrong = screen.getAllByRole('radio').find((b) => /wrong/.test(b.textContent ?? ''))!;
    const picked = wrong.textContent!.replace(/^./, '').trim();
    fireEvent.click(wrong);
    expect(screen.getByText(/Not this time: the answer is/)).toBeTruthy();
    expect(screen.getByText(new RegExp(`not ${picked.split(' ')[1]}`))).toBeTruthy();
    expect(screen.getAllByRole('radio').every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    // As in the other modes: a reason under every wrong option, and the passage after a miss.
    expect(screen.getAllByText(/^Why not:$/).length).toBe(2);
    expect(screen.getByText(/^passage \d$/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'I don’t know' })).toBeNull();
  });

  it('shows the answer on I don’t know, and a right pick as right', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Start the test' }));
    fireEvent.click(screen.getByRole('button', { name: 'I don’t know' }));
    expect(screen.getByText(/^The answer is [ABCD]\.$/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getAllByRole('radio').find((b) => /right/.test(b.textContent ?? ''))!);
    expect(screen.getByText('✓ Correct')).toBeTruthy();
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

  it('is multiple choice only unless written answers are chosen', () => {
    useCoursesStore.setState({ courses: { c: withWritten } });
    render(
      <MemoryRouter initialEntries={['/study/c/test']}>
        <Routes>
          <Route path="/study/:id/test" element={<TestRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Multiple choice' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'All 3' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Multiple choice and written answers' }));
    expect(screen.getByRole('button', { name: 'All 4' })).toBeTruthy();
  });
});

describe('practice test: answers at the end, if chosen', () => {
  it('marks nothing until the end, and lets an answer be changed', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'At the end' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start the test' }));
    const radios = () => screen.getAllByRole('radio');
    fireEvent.click(radios().find((b) => /wrong/.test(b.textContent ?? ''))!);
    expect(screen.queryByText(/Not this time|Correct/)).toBeNull();
    // Changed to the right one: still nothing said.
    fireEvent.click(radios().find((b) => /right/.test(b.textContent ?? ''))!);
    expect(radios().find((b) => /right/.test(b.textContent ?? ''))!.getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByText(/Correct/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'End and see my score' }));
    expect(screen.getByText(/1 of 3|1\/3/)).toBeTruthy();
  });
});
