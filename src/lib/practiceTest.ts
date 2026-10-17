import type { Course, McqItem } from '@/schema/course';
import type { Coverage } from './classExams';
import { shuffle } from './shuffle';
import { sortedSections } from './sortedSections';

/**
 * A practice test: the questions that test understanding, asked the way an
 * exam asks them (no answer until the end), across one lecture or every
 * lecture an exam covers.
 *
 * Only MCQs, and only the medium and hard ones: an easy MCQ recognises a fact
 * as stated, which the typed terms already practise, while medium and hard
 * ones apply, tell apart, chain and predict (prompts/generator.md, part 3).
 * A question with no difficulty counts as medium: older lectures were made
 * before every question carried one.
 */

export interface TestQuestion {
  courseId: string;
  lecture: string;
  sectionId: string;
  section: string;
  item: McqItem;
}

export interface TestScope {
  courseId: string;
  course: Course;
  covers: Coverage;
  /** Only these cards (a studies choice, lib/studies.ts). */
  only?: ReadonlySet<string>;
}

export const TEST_LENGTHS = [20, 40] as const;

const usable = (item: McqItem): boolean => {
  const n = item.options?.length ?? 0;
  return (
    n >= 2 &&
    Number.isInteger(item.correct_index) &&
    item.correct_index >= 0 &&
    item.correct_index < n &&
    item.difficulty !== 'easy'
  );
};

/** Every question a test over these lectures can ask, in course order. */
export function testPool(scopes: TestScope[]): TestQuestion[] {
  const out: TestQuestion[] = [];
  for (const { courseId, course, covers, only } of scopes) {
    for (const section of sortedSections(course)) {
      if (covers !== 'all' && !covers.includes(section.id)) continue;
      for (const item of section.items) {
        if (item.type !== 'mcq' || item.set_aside || !usable(item) || (only && !only.has(item.id))) continue;
        out.push({ courseId, lecture: course.metadata.title, sectionId: section.id, section: section.title, item });
      }
    }
  }
  return out;
}

/**
 * A test of `length` questions drawn at random from the pool (all of it when
 * `length` is undefined or larger). A random draw keeps each section's share
 * of the test to its share of the questions, and the lecture spends its
 * questions on what it weighs most.
 *
 * `even` shares the test equally between the lectures instead, so a short
 * lecture is asked as much as a long one (an exam often gives each lecture
 * a similar share whatever its length). A lecture with too few questions for
 * its share gives the rest to the others.
 */
export function drawTest(pool: TestQuestion[], length?: number, even = false): TestQuestion[] {
  const all = shuffle(pool);
  if (!length || length >= all.length) return all;
  if (!even) return all.slice(0, length);
  const byLecture = new Map<string, TestQuestion[]>();
  for (const q of all) {
    const pile = byLecture.get(q.courseId);
    if (pile) pile.push(q);
    else byLecture.set(q.courseId, [q]);
  }
  // Take one from each lecture in turn until the test is full.
  const piles = shuffle([...byLecture.values()]);
  const out: TestQuestion[] = [];
  for (let round = 0; out.length < length; round++) {
    for (const pile of piles) if (round < pile.length && out.length < length) out.push(pile[round]);
  }
  return shuffle(out);
}

/** How many lectures a pool draws from: the even draw is only a choice with two or more. */
export function lecturesIn(pool: TestQuestion[]): number {
  return new Set(pool.map((q) => q.courseId)).size;
}

export interface TestResult {
  got: number;
  total: number;
  /** Per section, in the order they first appear in the test. */
  bySection: { key: string; lecture: string; section: string; got: number; total: number }[];
  /** The questions answered wrong or left blank, in test order. */
  missed: { q: TestQuestion; chose: number | null }[];
}

/** Scores answers (option index, or null for none) against the test. */
export function scoreTest(test: TestQuestion[], answers: (number | null)[]): TestResult {
  const sections = new Map<string, TestResult['bySection'][number]>();
  const missed: TestResult['missed'] = [];
  let got = 0;
  test.forEach((q, i) => {
    const chose = answers[i] ?? null;
    const right = chose === q.item.correct_index;
    if (right) got++;
    else missed.push({ q, chose });
    const key = `${q.courseId}/${q.sectionId}`;
    const row = sections.get(key) ?? { key, lecture: q.lecture, section: q.section, got: 0, total: 0 };
    row.total++;
    if (right) row.got++;
    sections.set(key, row);
  });
  return { got, total: test.length, bySection: [...sections.values()], missed };
}

/**
 * Forgets the saved practice tests of a lecture that is removed (TestRoute
 * keeps them under `arborous:test:lecture:<id>:<section>`), so a lecture
 * added again under the same id does not reopen an old test.
 */
export function clearSavedTests(courseId: string): void {
  try {
    const prefix = `arborous:test:lecture:${courseId}:`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Storage blocked: nothing was saved either.
  }
}
