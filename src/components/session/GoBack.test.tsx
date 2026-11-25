import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { useResumeStore } from '@/store/resume';
import { useSessionStore } from '@/store/session';
import { SessionRoute } from '@/routes/SessionRoute';

// Made up: two questions, each with one plainly right option.
const mcq = (id: string, question: string) => ({
  id,
  type: 'mcq',
  question,
  options: [`${id} right`, `${id} wrong one`, `${id} wrong two`, `${id} wrong three`],
  correct_index: 0,
  source_excerpt: 'x',
});
const lecture = {
  schema_version: '1.0',
  metadata: { title: 'Back' },
  sections: [
    {
      id: 's1',
      title: 'One',
      items: [mcq('q1', 'First?'), mcq('q2', 'Second?'), { id: 'd1', type: 'definition', term: 'Myelin', definition: 'Fatty sheath around an axon.' }],
    },
  ],
} as unknown as Course;

afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
  useProgressStore.setState({ byCourse: {} });
  useResumeStore.setState({ byCourse: {} });
});

describe('going back in a sitting', () => {
  it('shows the answer given, not the card reset (the owner, 2026-11-17)', () => {
    useCoursesStore.setState({ courses: { back: lecture } });
    render(
      <MemoryRouter initialEntries={['/session/back/quiz']}>
        <Routes>
          <Route path="/session/:id/:mode" element={<SessionRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    const id = useSessionStore.getState().current()!.id;
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(`${id} wrong one`) }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    expect(useSessionStore.getState().current()!.id).not.toBe(id);
    fireEvent.click(screen.getByRole('button', { name: /Prev/ }));
    expect(useSessionStore.getState().current()!.id).toBe(id);
    // The same card, still answered: the options locked, the wrong pick marked.
    const picked = screen.getByRole('radio', { name: new RegExp(`${id} wrong one`) });
    expect(picked).toHaveProperty('disabled', true);
    expect(picked.textContent).toContain('✗');
  });

  it('shuts the glossary while a question is asked, and says when it opens (the owner, 2026-11-17)', () => {
    // A laptop: the wide layout, below the 1280px that gives the glossary a margin.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({ matches: query.includes('1024'), addEventListener() {}, removeEventListener() {} }),
    });
    useCoursesStore.setState({ courses: { back: lecture } });
    render(
      <MemoryRouter initialEntries={['/session/back/quiz']}>
        <Routes>
          <Route path="/session/:id/:mode" element={<SessionRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    const glossary = () => screen.getByRole('button', { name: 'Glossary' });
    expect(glossary()).toHaveProperty('disabled', true);
    expect(screen.getByText('Opens after you answer.')).toBeTruthy();
    const id = useSessionStore.getState().current()!.id;
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(`${id} right`) }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(glossary()).toHaveProperty('disabled', false);
    fireEvent.click(glossary());
    expect(screen.getByText('Fatty sheath around an axon.')).toBeTruthy();
    // On to the next question with it open: shut, and saying why.
    expect(useSessionStore.getState().items.map((i) => i.type).every((t) => t !== 'definition')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    expect(screen.queryByText('Fatty sheath around an axon.')).toBeNull();
    expect(screen.getByText(/Shut while a question is asked/)).toBeTruthy();
    Reflect.deleteProperty(window, 'matchMedia');
  });
});

describe('the glossary margin at 1280px and up', () => {
  const wideScreen = (matches: boolean) =>
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      // The wide layout as well: 1280px is wider than 1024.
      value: (query: string) => ({ matches: matches && (query.includes('1280') || query.includes('1024')), addEventListener() {}, removeEventListener() {} }),
    });
  afterEach(() => Reflect.deleteProperty(window, 'matchMedia'));

  it('is always there, and shuts while a question is asked (the owner, 2026-11-17)', () => {
    wideScreen(true);
    useCoursesStore.setState({ courses: { back: lecture } });
    render(
      <MemoryRouter initialEntries={['/session/back/quiz']}>
        <Routes>
          <Route path="/session/:id/:mode" element={<SessionRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    // No button to open it: a margin, shut with its reason while the question is up.
    expect(screen.queryByRole('button', { name: 'Glossary' })).toBeNull();
    expect(screen.getByText(/Shut while a question is asked/)).toBeTruthy();
    expect(screen.queryByText('Fatty sheath around an axon.')).toBeNull();
    const id = useSessionStore.getState().current()!.id;
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(`${id} right`) }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText('Fatty sheath around an axon.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    expect(screen.queryByText('Fatty sheath around an axon.')).toBeNull();
    expect(screen.getByText(/Shut while a question is asked/)).toBeTruthy();
  });
});

describe('the pause between steps', () => {
  it('has Back beside Next and Stop here, to the card that ended the step (the owner, 2026-11-20)', () => {
    const section = (n: number) => ({
      id: `s${n}`,
      title: `Part ${n}`,
      items: [
        { id: `d${n}`, type: 'definition', term: `Term ${n}`, definition: `What term ${n} means, in a sentence.` },
        mcq(`m${n}`, `Question ${n}?`),
      ],
    });
    const two = { schema_version: '1.0', metadata: { title: 'Steps' }, sections: [section(1), section(2)] } as unknown as Course;
    useCoursesStore.setState({ courses: { steps: two } });
    render(
      <MemoryRouter initialEntries={['/session/steps/learn']}>
        <Routes>
          <Route path="/session/:id/:mode" element={<SessionRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    const pauseButton = () => screen.queryByRole('button', { name: /^Next (section|step)$/ });
    for (let i = 0; i < 30 && !pauseButton(); i++) fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    expect(pauseButton()).toBeTruthy();
    const after = useSessionStore.getState().index;
    fireEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(pauseButton()).toBeNull();
    expect(useSessionStore.getState().index).toBe(after - 1);
  });
});

describe('the glossary on a phone', () => {
  it('sits between Prev and Next, shut until the answer is in, and opens as a sheet', () => {
    useCoursesStore.setState({ courses: { back: lecture } });
    render(
      <MemoryRouter initialEntries={['/session/back/quiz']}>
        <Routes>
          <Route path="/session/:id/:mode" element={<SessionRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    const glossary = () => screen.getByRole('button', { name: /^Glossary/ });
    expect(glossary()).toHaveProperty('disabled', true);
    // Greyed on screen; said only to a screen reader.
    expect(glossary().textContent).toContain('after you answer');
    const id = useSessionStore.getState().current()!.id;
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(`${id} right`) }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(glossary());
    expect(screen.getByRole('dialog', { name: 'Glossary' })).toBeTruthy();
    expect(screen.getByText('Fatty sheath around an axon.')).toBeTruthy();
  });
});
