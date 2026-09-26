import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { usePlanStore } from '@/store/plan';
import { ExamDialog } from './ExamDialog';

const course = {
  schema_version: '1.0',
  metadata: { title: 'Bio' },
  sections: ['a', 'b', 'c'].map((id, i) => ({ id, title: `Section ${id}`, order: i, items: [] })),
} as unknown as Course;
const saved = () => useCoursesStore.getState().courses.bio.metadata;

describe('ExamDialog', () => {
  beforeEach(() => {
    useCoursesStore.setState({ courses: { bio: course } });
    usePlanStore.setState({ byCourse: {} });
  });

  afterEach(cleanup);

  const open = () => render(<ExamDialog courseId="bio" course={course} onClose={() => {}} />);
  const setDate = (value: string) => fireEvent.change(screen.getByLabelText('Exam date'), { target: { value } });

  it('stores no section list when every section is on the exam, so later lectures count too', () => {
    open();
    setDate('2026-10-27');
    fireEvent.click(screen.getByText('Save'));
    expect(saved().exam_date).toBe('2026-10-27');
    expect(saved().exam_sections).toBeUndefined();
  });

  it('stores the sections when some are left off', () => {
    open();
    setDate('2026-10-27');
    fireEvent.click(screen.getByLabelText(/Section c/));
    fireEvent.click(screen.getByText('Save'));
    expect(saved().exam_sections).toEqual(['a', 'b']);
  });

  it('saves the minutes a day on this device', () => {
    open();
    fireEvent.click(screen.getByRole('radio', { name: '45 min' }));
    fireEvent.click(screen.getByText('Save'));
    expect(usePlanStore.getState().minutesFor('bio')).toBe(45);
  });

  it('clears the exam, and its sections with it', () => {
    useCoursesStore.setState({ courses: { bio: { ...course, metadata: { title: 'Bio', exam_date: '2026-10-27', exam_sections: ['a'] } } } });
    render(<ExamDialog courseId="bio" course={useCoursesStore.getState().courses.bio} onClose={() => {}} />);
    fireEvent.click(screen.getByText('No exam'));
    fireEvent.click(screen.getByText('Save'));
    expect(saved().exam_date).toBeUndefined();
    expect(saved().exam_sections).toBeUndefined();
  });
});
