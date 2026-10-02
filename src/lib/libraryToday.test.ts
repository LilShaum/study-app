import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { todayAcrossCourses } from './libraryToday';

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
