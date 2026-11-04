import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { CourseRoute } from './CourseRoute';

const DAY = 86_400_000;

const section = (id: string, title: string) => ({
  id,
  title,
  items: ['q', 'f'].map((k) => ({ id: `${id}${k}`, type: 'flashcard', front: `${id} ${k}?`, back: 'b', source_excerpt: 'x' })),
});

const course = {
  schema_version: '1.0',
  metadata: {
    title: 'Cell Biology',
    course_code: 'BIOL200',
    subject: 'Biology',
    description: 'What a cell does with its membranes.',
    tags: ['membranes'],
  },
  sections: [section('s1', 'Membranes'), section('s2', 'Transport'), section('s3', 'Signals')],
} as unknown as Course;

function open(search = '') {
  const faded = { got: 1, missed: 0, lastSeen: Date.now() - 30 * DAY };
  const fresh = { got: 2, missed: 0, lastSeen: Date.now() };
  useCoursesStore.setState({ courses: { cell: course } });
  // One section faded, one still held, one never opened.
  useProgressStore.setState({ byCourse: { cell: { s1q: faded, s1f: faded, s2q: fresh, s2f: fresh } } });
  return render(
    <MemoryRouter initialEntries={[`/study/cell${search}`]}>
      <Routes>
        <Route path="/study/:id" element={<CourseRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
  useProgressStore.setState({ byCourse: {} });
});

describe("the lecture page's first screen", () => {
  it("folds the file's details behind one line, nothing lost", () => {
    open();
    const fold = screen.getByText('About this lecture ▸').closest('details')!;
    expect(fold.open).toBe(false);
    for (const detail of ['BIOL200', 'Biology', '6 items in 3 sections', 'membranes', 'What a cell does with its membranes.']) {
      expect(fold.textContent).toContain(detail);
    }
  });

  it("keeps the title and Today's Start outside the fold", () => {
    open();
    expect(screen.getByRole('heading', { name: 'Cell Biology' }).closest('details')).toBeNull();
    expect(screen.getByRole('link', { name: 'Start' }).closest('details')).toBeNull();
  });
});

describe('the three versions of the tree', () => {
  it('says the same line of words in each', () => {
    for (const version of ['1', '2', '3']) {
      const { container } = open(`?tree=${version}`);
      expect(container.textContent).toContain('3 sections · 1 fading · 1 not started');
      cleanup();
    }
  });

  it('1, the plate: the drawing alone, a tap opening the large tree', () => {
    const { container } = open('?tree=1');
    expect(screen.getByRole('button', { name: /sections in leaf\. Open it/ })).toBeTruthy();
    expect(container.querySelector('figure a')).toBeNull();
  });

  it('2, the map: every branch numbered, each number a way into its section', () => {
    open('?tree=2');
    const keys = screen.getAllByRole('link', { name: /^Section \d/ });
    expect(keys.map((a) => a.getAttribute('aria-label'))).toEqual([
      expect.stringMatching(/^Section 1, Membranes: fading, \d+% still held$/),
      'Section 2, Transport: still held',
      'Section 3, Signals: not started',
    ]);
    expect(keys[0].getAttribute('href')).toBe('#/study/cell/section/s1');
    expect(keys.map((a) => a.textContent)).toEqual(['1', '2', '3']);
  });

  it('3, the key: the fading section named, a tap from its Review', () => {
    open('?tree=3');
    expect(screen.getByRole('link', { name: /Membranes.*Review 2/ }).getAttribute('href')).toBe('/session/cell/review?section=s1');
    expect(screen.queryByRole('link', { name: /Transport.*Review/ })).toBeNull();
  });
});
