import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { AddToCourseDialog } from './AddToCourseDialog';

/** The file the AI handed back, uploaded as the only way in. */
const upload = (text: string) =>
  fireEvent.change(screen.getByLabelText('Upload the file the AI made'), {
    target: { files: [new File([text], 'items.json', { type: 'application/json' })] },
  });

const course = {
  schema_version: '1.0',
  metadata: { title: 'Bio' },
  sections: [{ id: 's1', title: 'Signals', items: [{ id: 'q1', type: 'mcq', question: 'Why?', options: ['a', 'b', 'c', 'd'], correct_index: 0, explanation: 'x' }] }],
} as unknown as Course;

describe('AddToCourseDialog, explanations', () => {
  beforeEach(() => useCoursesStore.setState({ courses: { bio: course } }));
  afterEach(cleanup);

  it('adds only the explanations in a reply, and says what it left out', async () => {
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
    upload(JSON.stringify(reply));
    expect(await screen.findByText('Left out 1 item that is not an explanation.')).toBeTruthy();
    // One item, the explanation: the question in the reply is not added.
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 item' }));
    const items = useCoursesStore.getState().courses.bio.sections[0].items;
    expect(items.map((i) => i.id)).toEqual(['q1', 'exp1_a']);
  });

  it('says so when a reply has no explanations at all', async () => {
    render(<AddToCourseDialog courseId="bio" course={course} initialMode="explain" onClose={() => {}} />);
    const reply = { sections: [{ id: 's1', items: [{ id: 'x', type: 'flashcard', front: 'F', back: 'B' }] }] };
    upload(JSON.stringify(reply));
    expect(await screen.findByText(/no explanations in it/)).toBeTruthy();
  });
});

describe('AddToCourseDialog, what to make', () => {
  beforeEach(() => useCoursesStore.setState({ courses: { bio: course } }));
  afterEach(cleanup);

  it('offers select all that apply as its own tick, ticked by default, for new material and for more practice', () => {
    for (const initialMode of ['material', 'practice'] as const) {
      render(<AddToCourseDialog courseId="bio" course={course} initialMode={initialMode} onClose={() => {}} />);
      fireEvent.click(screen.getByRole('radio', { name: 'Only the kinds I tick' }));
      const tick = screen.getByRole('checkbox', { name: 'Select all that apply' }) as HTMLInputElement;
      expect(tick.checked).toBe(true);
      fireEvent.click(tick);
      expect(tick.checked).toBe(false);
      cleanup();
    }
  });

  it('leaves it unticked on a lecture made without it', () => {
    const chosen = { ...course, metadata: { ...course.metadata, make: ['mcq', 'flashcard'] } } as Course;
    render(<AddToCourseDialog courseId="bio" course={chosen} initialMode="practice" onClose={() => {}} />);
    expect((screen.getByRole('checkbox', { name: 'Select all that apply' }) as HTMLInputElement).checked).toBe(false);
  });
});
