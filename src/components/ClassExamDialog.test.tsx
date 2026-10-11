import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { useToastStore } from '@/store/toast';
import { classExams, lecturesOf } from '@/lib/classExams';
import { ClassExamDialog } from './ClassExamDialog';

const lecture = (title: string, metadata: Partial<Course['metadata']> = {}): Course =>
  ({
    schema_version: '1.0',
    metadata: { title, course_code: 'BIOC301', ...metadata },
    sections: ['s1', 's2', 's3'].map((id, i) => ({ id, title: `${title} part ${i + 1}`, order: i, items: [] })),
  }) as unknown as Course;

const meta = (id: string) => useCoursesStore.getState().courses[id].metadata;

describe('ClassExamDialog', () => {
  beforeEach(() => {
    useCoursesStore.setState({ courses: { a: lecture('Lecture 1'), b: lecture('Lecture 2'), c: lecture('Lecture 3') } });
  });
  afterEach(cleanup);

  const open = (examId?: string) => {
    const lectures = lecturesOf(useCoursesStore.getState().courses, 'BIOC301');
    const exams = classExams(lectures, Date.now());
    render(<ClassExamDialog code="BIOC301" lectures={lectures} exams={exams} exam={exams.find((e) => e.id === examId)} onClose={() => {}} />);
  };

  it('adds an exam on the lectures ticked, with the sections ticked', () => {
    open();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Midterm 1' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-10-20' } });
    // Not on lecture 3; only part 1 of lecture 2.
    fireEvent.click(screen.getByLabelText(/Lecture 3/));
    fireEvent.click(screen.getAllByRole('button', { name: /all 3/ })[1]);
    fireEvent.click(screen.getByLabelText(/Lecture 2 part 2/));
    fireEvent.click(screen.getByLabelText(/Lecture 2 part 3/));
    fireEvent.click(screen.getByText('Save'));
    expect(meta('a').exams).toEqual([{ id: expect.any(String), name: 'Midterm 1', date: '2099-10-20' }]);
    expect(meta('b').exams).toEqual([{ id: meta('a').exams![0].id, name: 'Midterm 1', date: '2099-10-20', sections: ['s1'] }]);
    expect(meta('c').exams).toBeUndefined();
  });

  it('keeps the other exams when one changes', () => {
    useCoursesStore.setState({
      courses: {
        a: lecture('Lecture 1', { exams: [{ id: 'm1', name: 'Midterm 1', date: '2099-10-20' }, { id: 'f', name: 'Final', date: '2099-12-15' }] }),
        b: lecture('Lecture 2', { exams: [{ id: 'f', name: 'Final', date: '2099-12-15' }] }),
        c: lecture('Lecture 3'),
      },
    });
    open('f');
    fireEvent.click(screen.getByLabelText(/Lecture 3/));
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-12-16' } });
    fireEvent.click(screen.getByText('Save'));
    expect(meta('a').exams).toEqual([
      { id: 'm1', name: 'Midterm 1', date: '2099-10-20' },
      { id: 'f', name: 'Final', date: '2099-12-16' },
    ]);
    expect(meta('c').exams).toEqual([{ id: 'f', name: 'Final', date: '2099-12-16' }]);
  });

  it('removes an exam, and Undo puts it back', () => {
    useCoursesStore.setState({ courses: { a: lecture('Lecture 1', { exams: [{ id: 'f', name: 'Final', date: '2099-12-15' }] }) } });
    open('f');
    fireEvent.click(screen.getByText('Remove this exam'));
    expect(meta('a').exams).toBeUndefined();
    const t = useToastStore.getState().toasts.at(-1)!;
    t.onAction!();
    expect(meta('a').exams).toEqual([{ id: 'f', name: 'Final', date: '2099-12-15' }]);
  });

  it('will not save without a date or with nothing ticked', () => {
    open();
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-10-20' } });
    fireEvent.click(screen.getByText('None'));
    expect((screen.getByText('Save') as HTMLButtonElement).disabled).toBe(true);
  });
});
