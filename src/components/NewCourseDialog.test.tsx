import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { useToastStore } from '@/store/toast';
import { NewCourseDialog } from './NewCourseDialog';

afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
});

/** The file the AI handed back, uploaded as the only way in. */
const upload = async (text: string) => {
  fireEvent.change(screen.getByLabelText('Upload the file'), {
    target: { files: [new File([text], 'lecture.study.json', { type: 'application/json' })] },
  });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Add lecture' }) as HTMLButtonElement).disabled).toBe(false));
};

const reply = JSON.stringify({
  schema_version: '1.0',
  metadata: { title: 'Made up' },
  sections: [{ id: 's1', title: 'One', items: [{ id: 'f1', type: 'flashcard', front: 'Q?', back: 'A.' }] }],
});

describe('NewCourseDialog: the file is the way in', () => {
  it('has no paste box', () => {
    render(
      <MemoryRouter>
        <NewCourseDialog onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('textbox', { name: /reply/i })).toBeNull();
    expect(screen.queryByPlaceholderText(/Paste the AI/)).toBeNull();
  });

  it('shows the AI\'s notes once, when the lecture is added', async () => {
    useToastStore.setState({ toasts: [] });
    render(
      <MemoryRouter>
        <NewCourseDialog onClose={() => {}} />
      </MemoryRouter>,
    );
    await upload(JSON.stringify({ ...JSON.parse(reply), metadata: { title: 'Made up', notes_for_student: ['Slide 4 was blank.', 'Two figures were unreadable.'] } }));
    fireEvent.click(screen.getByRole('button', { name: 'Add lecture' }));
    const notes = useToastStore.getState().toasts.find((t) => t.message.startsWith('Notes from the AI'));
    expect(notes?.message).toContain('• Slide 4 was blank.');
    expect(notes?.message).toContain('• Two figures were unreadable.');
  });

  it('says nothing when the file has no notes', async () => {
    useToastStore.setState({ toasts: [] });
    render(
      <MemoryRouter>
        <NewCourseDialog onClose={() => {}} />
      </MemoryRouter>,
    );
    await upload(reply);
    fireEvent.click(screen.getByRole('button', { name: 'Add lecture' }));
    expect(useToastStore.getState().toasts.some((t) => t.message.startsWith('Notes from the AI'))).toBe(false);
  });
});

describe('NewCourseDialog: what to make', () => {
  it('keeps the kinds chosen on the lecture, for its later prompts', async () => {
    render(
      <MemoryRouter>
        <NewCourseDialog onClose={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText('Multiple choice'));
    await upload(reply);
    fireEvent.click(screen.getByRole('button', { name: 'Add lecture' }));
    const [added] = Object.values(useCoursesStore.getState().courses);
    // Select all that apply has its own tick, left ticked: unticking Multiple choice leaves it.
    expect(added.metadata.make).toEqual(['multi', 'flashcard', 'terms', 'written', 'explain', 'example', 'problem', 'graphic']);
  });

  it('keeps nothing when every kind is left ticked', async () => {
    render(
      <MemoryRouter>
        <NewCourseDialog onClose={() => {}} />
      </MemoryRouter>,
    );
    await upload(reply);
    fireEvent.click(screen.getByRole('button', { name: 'Add lecture' }));
    const [added] = Object.values(useCoursesStore.getState().courses);
    expect(added.metadata.make).toBeUndefined();
  });
});

describe('NewCourseDialog: which class', () => {
  it('stamps the class picked on the lecture, whatever the AI wrote (the owner, 2026-11-11)', async () => {
    const existing = JSON.parse(reply);
    useCoursesStore.setState({ courses: { old: { ...existing, metadata: { title: 'Old', course_code: 'PSYC 351' } } } });
    render(
      <MemoryRouter>
        <NewCourseDialog onClose={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'PSYC 351' }));
    await upload(JSON.stringify({ ...existing, metadata: { title: 'New', course_code: 'BIOL 365' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Add lecture' }));
    const added = Object.values(useCoursesStore.getState().courses).find((c) => c.metadata.title === 'New')!;
    expect(added.metadata.course_code).toBe('PSYC 351');
  });

  it('takes a class not yet in the library, typed', async () => {
    render(
      <MemoryRouter>
        <NewCourseDialog onClose={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Type its code' }));
    fireEvent.change(screen.getByLabelText('Another class'), { target: { value: 'CHEM 200' } });
    await upload(reply);
    fireEvent.click(screen.getByRole('button', { name: 'Add lecture' }));
    const [added] = Object.values(useCoursesStore.getState().courses);
    expect(added.metadata.course_code).toBe('CHEM 200');
  });

  it('asks once when the class in the file is a typo away from one in the library', async () => {
    const existing = JSON.parse(reply);
    useCoursesStore.setState({ courses: { old: { ...existing, metadata: { title: 'Old', course_code: 'PSYC 351' } } } });
    render(
      <MemoryRouter>
        <NewCourseDialog onClose={() => {}} />
      </MemoryRouter>,
    );
    await upload(JSON.stringify({ ...existing, metadata: { title: 'New', course_code: 'PSYC351C' } }));
    expect(screen.getByRole('radio', { name: 'Put it with PSYC 351' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Add lecture' }));
    const added = Object.values(useCoursesStore.getState().courses).find((c) => c.metadata.title === 'New')!;
    expect(added.metadata.course_code).toBe('PSYC 351');
  });
});
