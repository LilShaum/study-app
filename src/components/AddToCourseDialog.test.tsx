import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { AddToCourseDialog } from './AddToCourseDialog';

const course = {
  schema_version: '1.0',
  metadata: { title: 'Bio' },
  sections: [{ id: 's1', title: 'Signals', items: [{ id: 'q1', type: 'mcq', question: 'Why?', options: ['a', 'b', 'c', 'd'], correct_index: 0, explanation: 'x' }] }],
} as unknown as Course;

describe('AddToCourseDialog, explanations', () => {
  beforeEach(() => useCoursesStore.setState({ courses: { bio: course } }));
  afterEach(cleanup);

  it('adds only the explanations in a reply, and says what it left out', () => {
    render(<AddToCourseDialog courseId="bio" course={course} initialMode="explain" onClose={() => {}} />);
    const reply = {
      sections: [
        {
          id: 's1',
          items: [
            { id: 'exp1_a', type: 'explain', title: 'Why the signal lasts', text: 'It is not broken down.' },
            { id: 'exp1_b', type: 'mcq', question: 'Check: why?', options: ['a', 'b', 'c', 'd'], correct_index: 0, explanation: 'x' },
          ],
        },
      ],
    };
    fireEvent.change(screen.getByRole('textbox', { name: /paste the JSON back/i }), { target: { value: JSON.stringify(reply) } });
    expect(screen.getByText('Left out 1 item that is not an explanation.')).toBeTruthy();
    // One item, the explanation: the question in the reply is not added.
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 item' }));
    const items = useCoursesStore.getState().courses.bio.sections[0].items;
    expect(items.map((i) => i.id)).toEqual(['q1', 'exp1_a']);
  });

  it('says so when a reply has no explanations at all', () => {
    render(<AddToCourseDialog courseId="bio" course={course} initialMode="explain" onClose={() => {}} />);
    const reply = { sections: [{ id: 's1', items: [{ id: 'x', type: 'flashcard', front: 'F', back: 'B' }] }] };
    fireEvent.change(screen.getByRole('textbox', { name: /paste the JSON back/i }), { target: { value: JSON.stringify(reply) } });
    expect(screen.getByText(/no explanations in it/)).toBeTruthy();
  });
});
