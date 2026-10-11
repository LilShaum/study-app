import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

  describe('a lecture in a class', () => {
    const inClass = { ...course, metadata: { title: 'Bio', course_code: 'BIOC301', exams: [{ id: 'f', name: 'Final', date: '2099-12-15' }] } } as Course;

    it('shows the class exams that cover it and sends you to the class to set them', () => {
      useCoursesStore.setState({ courses: { bio: inClass } });
      render(
        <MemoryRouter>
          <ExamDialog courseId="bio" course={inClass} onClose={() => {}} />
        </MemoryRouter>,
      );
      expect(screen.getByText('Final')).toBeTruthy();
      expect(screen.queryByLabelText('Exam date')).toBeNull();
      expect(screen.getByText('Set the exams for BIOC301').getAttribute('href')).toBe('/class/BIOC301');
    });

    it('saves the time a day without touching the lecture', () => {
      useCoursesStore.setState({ courses: { bio: inClass } });
      render(
        <MemoryRouter>
          <ExamDialog courseId="bio" course={inClass} onClose={() => {}} />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByText('Save'));
      expect(useCoursesStore.getState().courses.bio).toBe(inClass);
    });
  });
});
