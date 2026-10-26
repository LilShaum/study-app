import type { Course, FlashcardItem, McqItem } from '@/schema/course';
import { answerPoints, isWrittenExample, writtenFromExample } from './answerPoints';
import type { Coverage } from './classExams';
import { shuffle } from './shuffle';
import { sortedSections } from './sortedSections';

/**
 * A practice test: the questions that test understanding, asked the way an
 * exam asks them (no answer until the end), across one lecture or every
 * lecture an exam covers.
 *
 * Only the medium and hard MCQs: an easy MCQ recognises a fact as stated,
 * which the typed terms already practise, while medium and hard ones apply,
 * tell apart, chain and predict (prompts/generator.md, part 3). And the
 * medium and hard written questions (lib/answerPoints): an exam that has the
 * student write short and long answers is practised by writing them; they
 * are ticked point by point once the test ends. A question with no
 * difficulty counts as medium: older lectures were made before every
 * question carried one.
 */

/** A written question: a flashcard asked as a short or long answer. */
export type WrittenItem = FlashcardItem;
export type TestItem = McqItem | WrittenItem;

export const isWritten = (item: TestItem): item is WrittenItem => item.type === 'flashcard';

/**
 * An answer: the option picked, the text written (a written question), or
 * null for none. A written question's text is its answer even when empty
 * once its points are ticked: the student may answer in their head.
 */
export type TestAnswer = number | string | null;

/** A multiple-choice answer of "I don't know": a miss, unlike a blank, which says nothing. */
export const DONT_KNOW = -1;

export interface TestQuestion {
  courseId: string;
  lecture: string;
  sectionId: string;
  section: string;
  item: TestItem;
}

export interface TestScope {
  courseId: string;
  course: Course;
  covers: Coverage;
  /** Only these cards (a studies choice, lib/studies.ts). */
  only?: ReadonlySet<string>;
}

export const TEST_LENGTHS = [20, 40] as const;

const usableMcq = (item: McqItem): boolean => {
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
        if (item.set_aside || (only && !only.has(item.id))) continue;
        const card = isWrittenExample(item) ? writtenFromExample(item) : item;
        const asked: TestItem | null =
          card.type === 'mcq'
            ? usableMcq(card) ? card : null
            : card.type === 'flashcard' && card.difficulty !== 'easy' && answerPoints(card) ? card : null;
        if (!asked) continue;
        out.push({ courseId, lecture: course.metadata.title, sectionId: section.id, section: section.title, item: asked });
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
 * `testedAt` (when each question was last answered in a test) puts the
 * questions never on a test first, then those on one longest ago, so tests
 * taken one after another work through the pool rather than repeat it: two
 * random tests of 20 from 60 shared a third of their questions (the owner
 * asked for this, 2026-10-26). Random within each group.
 *
 * `even` shares the test equally between the lectures instead, so a short
 * lecture is asked as much as a long one (an exam often gives each lecture
 * a similar share whatever its length). A lecture with too few questions for
 * its share gives the rest to the others.
 */
export function drawTest(pool: TestQuestion[], length?: number, even = false, testedAt?: (q: TestQuestion) => number | undefined): TestQuestion[] {
  const all = testedAt
    ? shuffle(pool)
        .map((q, i) => ({ q, i, at: testedAt(q) ?? 0 }))
        .sort((a, b) => a.at - b.at || a.i - b.i)
        .map(({ q }) => q)
    : shuffle(pool);
  if (!length || length >= all.length) return shuffle(all);
  // Mixed again, so the fresh questions are not all at the start.
  if (!even) return shuffle(all.slice(0, length));
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
  /** The questions answered wrong or left blank, in test order, with a written one's ticks. */
  missed: { q: TestQuestion; chose: TestAnswer; ticks?: boolean[] }[];
}

/**
 * Whether a question was answered right. A written one needs every point
 * ticked, as full marks; until it is marked it is not.
 */
export function answeredRight(item: TestItem, answer: TestAnswer, ticks?: boolean[] | null): boolean {
  if (!isWritten(item)) return answer === item.correct_index;
  const need = answerPoints(item)?.need ?? ticks?.length ?? 1;
  return answer != null && !!ticks?.length && ticks.filter(Boolean).length >= need;
}

/** Scores answers against the test; `marks` holds each written question's ticked points. */
export function scoreTest(test: TestQuestion[], answers: TestAnswer[], marks: (boolean[] | null)[] = []): TestResult {
  const sections = new Map<string, TestResult['bySection'][number]>();
  const missed: TestResult['missed'] = [];
  let got = 0;
  test.forEach((q, i) => {
    const chose = answers[i] ?? null;
    const ticks = marks[i] ?? undefined;
    const right = answeredRight(q.item, chose, ticks);
    if (right) got++;
    else missed.push(isWritten(q.item) ? { q, chose, ticks: ticks ?? [] } : { q, chose });
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
