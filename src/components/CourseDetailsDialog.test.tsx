import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { CourseDetailsDialog } from './CourseDetailsDialog';

const course = {
  schema_version: '1.0',
  metadata: { title: 'Lecture 9', course_code: 'BIOC301', tags: ['enzymes'] },
  sections: [{ id: 's1', title: 'S', items: [] }],
} as unknown as Course;

const saved = () => useCoursesStore.getState().courses.bioc301.metadata;

beforeEach(() => {
  useCoursesStore.setState({ courses: { bioc301: course, other: { ...course, metadata: { title: 'Other', tags: ['week-1', 'exam'] } } as Course } });
});
afterEach(cleanup);

function open() {
  const onClose = vi.fn();
  render(<CourseDetailsDialog courseId="bioc301" course={course} onClose={onClose} />);
  return onClose;
}
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('CourseDetailsDialog', () => {
  it('renames the course without changing its storage id', () => {
    // The id is what progress and bookmarks are keyed by; rederiving it from
    // the new title would orphan the student's whole history for this course.
    const onClose = open();
    type('Title', 'Week 9 — Enzyme Kinetics');
    save();
    expect(Object.keys(useCoursesStore.getState().courses)).toContain('bioc301');
    expect(saved().title).toBe('Week 9 — Enzyme Kinetics');
    expect(onClose).toHaveBeenCalled();
  });

  it('adds a tag on Enter', () => {
    open();
    fireEvent.change(screen.getByLabelText('Add a tag'), { target: { value: 'week-9' } });
    fireEvent.keyDown(screen.getByLabelText('Add a tag'), { key: 'Enter' });
    save();
    expect(saved().tags).toEqual(['enzymes', 'week-9']);
  });

  it('keeps a tag still sitting in the box when you save', () => {
    // Typing a tag and pressing Save is not a request to discard it.
    open();
    fireEvent.change(screen.getByLabelText('Add a tag'), { target: { value: 'exam' } });
    save();
    expect(saved().tags).toEqual(['enzymes', 'exam']);
  });

  it('will not add the same tag twice, whatever the case', () => {
    open();
    for (const value of ['Enzymes', 'enzymes']) {
      fireEvent.change(screen.getByLabelText('Add a tag'), { target: { value } });
      fireEvent.keyDown(screen.getByLabelText('Add a tag'), { key: 'Enter' });
    }
    save();
    expect(saved().tags).toEqual(['enzymes']);
  });

  it('removes a tag', () => {
    open();
    fireEvent.click(screen.getByLabelText('Remove tag enzymes'));
    save();
    expect(saved().tags).toBeUndefined();
  });

  it('offers tags used by other courses, and not ones already on this one', () => {
    open();
    expect(screen.getByRole('button', { name: '+ week-1' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '+ enzymes' })).toBeNull();
  });

  it('drops an emptied optional field rather than storing an empty string', () => {
    open();
    type('Course code', '   ');
    save();
    expect('course_code' in saved()).toBe(false);
  });

  it('refuses to save an empty title', () => {
    open();
    type('Title', '  ');
    save();
    expect(saved().title).toBe('Lecture 9');
  });

  it('leaves the course content alone', () => {
    open();
    type('Title', 'Renamed');
    save();
    expect(useCoursesStore.getState().courses.bioc301.sections).toEqual(course.sections);
  });
});
