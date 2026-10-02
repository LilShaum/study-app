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

  it('stores the sections as a list even when all are ticked, so later lectures are asked about', () => {
    open();
    setDate('2026-10-27');
    fireEvent.click(screen.getByText('Save'));
    expect(saved().exam_date).toBe('2026-10-27');
    expect(saved().exam_sections).toEqual(['a', 'b', 'c']);
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

  describe('other courses of the same class', () => {
    const coded = (title: string, extra = {}) =>
      ({ ...course, metadata: { title, course_code: 'BIOL 365', ...extra } }) as unknown as Course;

    it('sets the same date on the courses ticked, covering all their sections', () => {
      useCoursesStore.setState({ courses: { bio: coded('Bio'), endo: coded('Endo'), cell: coded('Cell') } });
      render(<ExamDialog courseId="bio" course={useCoursesStore.getState().courses.bio} onClose={() => {}} />);
      setDate('2026-10-27');
      fireEvent.click(screen.getByLabelText('Endo'));
      fireEvent.click(screen.getByText('Save'));
      const all = useCoursesStore.getState().courses;
      expect(all.endo.metadata.exam_date).toBe('2026-10-27');
      expect(all.endo.metadata.exam_sections).toEqual(['a', 'b', 'c']);
      expect(all.cell.metadata.exam_date).toBeUndefined();
    });

    it('clears a course that shared the date once it is unticked', () => {
      const exam = { exam_date: '2026-10-27', exam_sections: ['a'] };
      useCoursesStore.setState({ courses: { bio: coded('Bio', exam), endo: coded('Endo', exam) } });
      render(<ExamDialog courseId="bio" course={useCoursesStore.getState().courses.bio} onClose={() => {}} />);
      expect((screen.getByLabelText('Endo') as HTMLInputElement).checked).toBe(true);
      fireEvent.click(screen.getByLabelText('Endo'));
      fireEvent.click(screen.getByText('Save'));
      expect(useCoursesStore.getState().courses.endo.metadata.exam_date).toBeUndefined();
    });
  });
});
