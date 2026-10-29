import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { NewCourseDialog } from './NewCourseDialog';

afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
});

const reply = JSON.stringify({
  schema_version: '1.0',
  metadata: { title: 'Made up' },
  sections: [{ id: 's1', title: 'One', items: [{ id: 'f1', type: 'flashcard', front: 'Q?', back: 'A.' }] }],
});

describe('NewCourseDialog: what to make', () => {
  it('keeps the kinds chosen on the lecture, for its later prompts', () => {
    render(
      <MemoryRouter>
        <NewCourseDialog onClose={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText('Multiple choice'));
    fireEvent.change(screen.getByRole('textbox', { name: /reply/i }), { target: { value: reply } });
    fireEvent.click(screen.getByRole('button', { name: 'Add lecture' }));
    const [added] = Object.values(useCoursesStore.getState().courses);
    expect(added.metadata.make).toEqual(['flashcard', 'terms', 'written', 'explain', 'example', 'graphic']);
  });

  it('keeps nothing when every kind is left ticked', () => {
    render(
      <MemoryRouter>
        <NewCourseDialog onClose={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole('textbox', { name: /reply/i }), { target: { value: reply } });
    fireEvent.click(screen.getByRole('button', { name: 'Add lecture' }));
    const [added] = Object.values(useCoursesStore.getState().courses);
    expect(added.metadata.make).toBeUndefined();
  });
});
