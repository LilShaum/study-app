import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { useResumeStore } from '@/store/resume';
import { useSessionStore } from '@/store/session';
import { SessionRoute } from '@/routes/SessionRoute';

// Made-up lectures that share item ids, as two generated lectures can.
const lecture = (title: string) =>
  ({
    schema_version: '1.0',
    metadata: { title, course_code: 'MIX 1' },
    sections: [
      {
        id: 's1',
        title: 'One',
        items: ['f1', 'f2'].map((id) => ({ id, type: 'flashcard', front: `${title} ${id}?`, back: `${title} ${id}.`, source_excerpt: 'x' })),
      },
    ],
  }) as unknown as Course;

function renderSession(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/session/:id/:mode" element={<SessionRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useCoursesStore.setState({ courses: {} });
  useProgressStore.setState({ byCourse: {} });
  useResumeStore.setState({ byCourse: {} });
});

describe("a class's Practice with the lectures mixed, through the session screen", () => {
  it("sets a card aside in its own lecture, keeps its bookmark to itself, and ends with each lecture's tree and counts", () => {
    useCoursesStore.setState({ courses: { a: lecture('MIX 1: Alpha'), b: lecture('MIX 1: Beta') } });
    // The mix drawn so that Beta's first card comes first, though the sitting opened in Alpha.
    const draws = [0.9, 0.9, 0.1, 0.1];
    vi.spyOn(Math, 'random').mockImplementation(() => draws.shift() ?? 0.5);
    renderSession('/session/a/flashcards?class=MIX%201&mix=1');
    vi.restoreAllMocks();
    const s = useSessionStore.getState;
    expect(s().items.map((i) => `${i._courseId}:${i.id}`)).toEqual(['b:f1', 'a:f1', 'b:f2', 'a:f2']);

    // The first card set aside as not on the exam: in Beta, not in Alpha.
    const first = s().current()!;
    const owner = first._courseId!;
    const other = owner === 'a' ? 'b' : 'a';
    expect(owner).toBe('b');
    fireEvent.click(screen.getByRole('button', { name: 'Not needed?' }));
    fireEvent.click(screen.getByRole('button', { name: 'not on my exam' }));
    const aside = (courseId: string, id: string) =>
      useCoursesStore.getState().courses[courseId].sections[0].items.find((i) => i.id === id)?.set_aside;
    expect(aside(owner, first.id)).toBeTruthy();
    expect(aside(other, first.id)).toBeFalsy();

    // Beta has a bookmark of its own (a Learn sitting) that the mixed sitting must not take over.
    const learnMark = { mode: 'learn' as const, sectionId: null, itemId: 'f2', index: 3, total: 9, updatedAt: 1 };
    useResumeStore.getState().save('b', learnMark);

    // Answer the rest: Got it on each. The sitting keeps one bookmark, in the
    // lecture it was opened in, naming the lecture of the card on screen.
    for (let k = 0; k < 10 && !s().finished; k++) {
      const card = s().current()!;
      if (s().index > 0) {
        const marks = Object.entries(useResumeStore.getState().byCourse).filter(([, b]) => b.mixed);
        expect(marks.map(([id, b]) => [id, b.itemCourseId, b.itemId])).toEqual([['a', card._courseId, card.id]]);
        expect(useResumeStore.getState().byCourse.b).toEqual(learnMark);
      }
      fireEvent.click(screen.getByRole('button', { name: 'Flip card' }));
      fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    }
    expect(s().finished).toBe(true);
    // Finishing forgets the bookmark.
    expect(Object.values(useResumeStore.getState().byCourse).filter((b) => b.mixed)).toHaveLength(0);
    // Each answer is in its own lecture.
    const answered = (courseId: string) => Object.values(useProgressStore.getState().byCourse[courseId] ?? {}).reduce((n, r) => n + r.got + r.missed, 0);
    expect(answered(owner) + answered(other)).toBe(3);
    expect(answered(owner)).toBe(1);
    expect(answered(other)).toBe(2);

    const list = screen.getByRole('list', { name: 'Lectures in this sitting' });
    expect(list.textContent).toContain('Alpha');
    expect(list.textContent).toContain('Beta');
    expect(list.querySelectorAll('svg').length).toBe(2);
    // No next lecture: every lecture was in the sitting.
    expect(screen.queryByRole('link', { name: /^Next:/ })).toBeNull();
  });
});
