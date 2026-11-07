import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

function open() {
  const faded = { got: 1, missed: 0, lastSeen: Date.now() - 30 * DAY };
  const fresh = { got: 2, missed: 0, lastSeen: Date.now() };
  useCoursesStore.setState({ courses: { cell: course } });
  // One section faded, one still held, one never opened.
  useProgressStore.setState({ byCourse: { cell: { s1q: faded, s1f: faded, s2q: fresh, s2f: fresh } } });
  return render(
    <MemoryRouter initialEntries={['/study/cell']}>
      <Routes>
        <Route path="/study/:id" element={<CourseRoute />} />
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

describe('the tree on the lecture page', () => {
  it('is the drawing alone and large with its line of words, the numbers down until it is touched', () => {
    const { container } = open();
    expect(screen.getByRole('group', { name: /sections in leaf\. Touch or focus it to number its sections/ })).toBeTruthy();
    expect(container.querySelector('.tree-keys')!.hasAttribute('data-shown')).toBe(false);
    expect(container.textContent).toContain('3 sections · 1 fading · 1 not started');
  });

  it('names the picked branch under the tree, with a way into it', () => {
    const { container } = open();
    fireEvent.focus(screen.getByRole('link', { name: /^Section 2, Transport/ }));
    const caption = container.querySelector('figcaption')!;
    expect(caption.textContent).toContain('Transport');
    expect(caption.textContent).not.toContain('fading');
    expect(caption.querySelector('a')!.getAttribute('href')).toBe('/study/cell/section/s2');
    // Tapping its Open must not put the numbers away under the finger.
    expect(caption.hasAttribute('data-keeps-tree-open')).toBe(true);
  });

  it('has no switch between versions any more: the owner chose', () => {
    open();
    expect(screen.queryByRole('button', { name: /^Version \d$/ })).toBeNull();
  });
});
