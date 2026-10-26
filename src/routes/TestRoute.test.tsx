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
    expect(screen.queryByRole('button', { name: 'I don’t know' })).toBeNull();
  });

  it('shows the answer on I don’t know, and a right pick as right', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Start the test' }));
    fireEvent.click(screen.getByRole('button', { name: 'I don’t know' }));
    expect(screen.getByText(/^The answer is [ABCD]\.$/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getAllByRole('radio').find((b) => /right/.test(b.textContent ?? ''))!);
    expect(screen.getByText('✓ Right.')).toBeTruthy();
  });
});

describe('practice test: adaptive', () => {
  it('asks first what was last got wrong, and says so', () => {
    useProgressStore.setState({ byCourse: { c: { q2: { got: 0, missed: 1, lastSeen: 1, lastGot: false, testedAt: 1 }, q3: { got: 1, missed: 0, lastSeen: 1, lastGot: true, testedAt: 1 } } } });
    open();
    expect(screen.getByText(/A new test asks first the 1 you last got wrong or didn’t know, then 1 not on a test yet\./)).toBeTruthy();
  });
});
