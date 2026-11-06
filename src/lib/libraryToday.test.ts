import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { dayAcross, dayLine, todayAcrossCourses, type CourseToday } from './libraryToday';

const DAY = 86_400_000;
const now = new Date(2026, 9, 1, 19).getTime();

/** A course of `cards` flashcards, and the progress that leaves the first `due` of them fading. */
function build(title: string, cards: number, due: number, examDate?: string) {
  const ids = Array.from({ length: cards }, (_, i) => `${title}${i}`);
  const course = {
    schema_version: '1.0',
    metadata: { title, ...(examDate ? { exam_date: examDate } : {}) },
    sections: [
      {
        id: 's',
        title: 'S',
        order: 1,
        items: ids.map((id) => ({ id, type: 'flashcard', front: `front ${id}`, back: 'b' })),
      },
    ],
  } as unknown as Course;
  const progress: Record<string, ItemResult> = Object.fromEntries(
    ids.map((id, i) => [
      id,
      i < due
        ? { got: 1, missed: 0, lastSeen: now - 30 * DAY, stability: 2 }
        : { got: 1, missed: 0, lastSeen: now, stability: 30 },
    ]),
  );
  return { course, progress };
}

function across(parts: Record<string, ReturnType<typeof build>>) {
  return todayAcrossCourses(
    Object.fromEntries(Object.entries(parts).map(([id, p]) => [id, p.course])),
    Object.fromEntries(Object.entries(parts).map(([id, p]) => [id, p.progress])),
    now,
    () => 30,
  );
}

describe('todayAcrossCourses', () => {
  it('leaves out a course with nothing due and nothing new', () => {
    const rows = across({ quiet: build('Quiet', 4, 0), busy: build('Busy', 4, 2) });
    expect(rows.map((r) => r.id)).toEqual(['busy']);
  });

  it('counts the reviews, and says there is nothing new when everything has been studied', () => {
    const [row] = across({ a: build('Algebra', 5, 3) });
    expect(row).toMatchObject({ id: 'a', title: 'Algebra', minutes: 30, review: 3, hasNew: false, examDays: null });
  });

  it('says there is new material when part of the course is untouched', () => {
    const fresh = build('Fresh', 4, 0);
    delete fresh.progress.Fresh3;
    const [row] = across({ f: fresh });
    expect(row.hasNew).toBe(true);
  });

  it('puts a course with an exam coming first, the soonest exam first', () => {
    const rows = across({
      none: build('None', 6, 6),
      later: build('Later', 2, 2, '2026-10-12'),
      soon: build('Soon', 2, 2, '2026-10-05'),
    });
    expect(rows.map((r) => r.id)).toEqual(['soon', 'later', 'none']);
    expect(rows.map((r) => r.examDays)).toEqual([4, 11, null]);
  });

  it('counts an exam tomorrow and an exam today as whole days', () => {
    const rows = across({
      today: build('Today', 2, 2, '2026-10-01'),
      tomorrow: build('Tomorrow', 2, 2, '2026-10-02'),
    });
    expect(rows.map((r) => r.examDays)).toEqual([0, 1]);
  });

  it('gives no exam days once the date has passed, and sorts it as having no exam', () => {
    const rows = across({
      few: build('Few', 2, 2),
      past: build('Past', 5, 5, '2026-09-20'),
    });
    expect(rows.find((r) => r.id === 'past')?.examDays).toBeNull();
    expect(rows.map((r) => r.id)).toEqual(['past', 'few']);
  });

  it('without exams, puts the course with more to review first, and keeps input order on a tie', () => {
    const rows = across({
      a: build('A', 4, 2),
      b: build('B', 6, 5),
      c: build('C', 4, 2),
    });
    expect(rows.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('the whole day across lectures', () => {
  const row = (over: Partial<CourseToday>): CourseToday => ({
    id: 'x',
    title: 'X',
    minutes: 30,
    catchUp: false,
    review: 0,
    hasNew: false,
    examDays: null,
    ...over,
  });

  it('adds up what the lectures left the student to add up', () => {
    const day = dayAcross([row({ review: 12, examDays: 9 }), row({ review: 6, hasNew: true, examDays: 4 }), row({ hasNew: true })]);
    expect(day).toEqual({ minutes: 90, review: 18, hasNew: true, allCatchUp: false });
    // The lectures are counted in the heading above it ("All 3 lectures").
    expect(dayLine(day)).toBe('90 min · 18 to review · new material');
  });

  it('says the catch-up when that is all that is left, as one lecture does', () => {
    const day = dayAcross([row({ minutes: 5, catchUp: true, review: 3 }), row({ minutes: 5, catchUp: true, review: 2 })]);
    expect(dayLine(day)).toBe('catch-up: 5 to look at again');
  });

  it('is not a catch-up while any lecture still has its time', () => {
    expect(dayAcross([row({ catchUp: true }), row({})]).allCatchUp).toBe(false);
  });
});

describe('todayAcrossCourses remembers each lecture', () => {
  it('gives the same answer again without rebuilding, and a fresh one when progress changes', () => {
    const a = build('A', 10, 4);
    const first = across({ a })[0];
    expect(across({ a })[0]).toBe(first);
    // A card answered: a new progress object, a new answer.
    const answered = { ...a.progress, A0: { got: 2, missed: 0, lastSeen: now, stability: 30 } };
    const after = todayAcrossCourses({ a: a.course }, { a: answered }, now, () => 30)[0];
    expect(after).not.toBe(first);
    expect(after.review).toBe(first.review - 1);
    // More time to spend, or a later minute: worked out again.
    expect(todayAcrossCourses({ a: a.course }, { a: a.progress }, now, () => 45)[0]).not.toBe(first);
    expect(todayAcrossCourses({ a: a.course }, { a: a.progress }, now + 61_000, () => 30)[0]).not.toBe(first);
  });
});
