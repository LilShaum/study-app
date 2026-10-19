import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { buildSessionItems, type CardKind, type StudyMode } from './buildSessionItems';
import { examRule, PROTECT_FROM_DAYS, type ExamRule } from './exam';
import { classExams } from './classExams';
import { daysToExam } from './libraryToday';
import { onlyStudies } from './studies';

/**
 * The Practice page's choices, shared by a lecture's Practice, a class's
 * Practice and the end of a practice session (which offers the class's next
 * lecture with cards for the same choice).
 */

export type Cards = 'due' | 'weakest' | 'missed' | 'everything';
export type Kind = 'all' | CardKind;

export const CARDS: { value: Cards; label: string }[] = [
  { value: 'due', label: 'Due now' },
  { value: 'weakest', label: 'Weakest first' },
  { value: 'missed', label: 'Missed last time' },
  { value: 'everything', label: 'Everything' },
];

export const KINDS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All kinds' },
  { value: 'questions', label: 'Questions' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'terms', label: 'Terms' },
];

const MODES: Record<Kind, StudyMode> = { all: 'mixed', questions: 'quiz', flashcards: 'flashcards', terms: 'definitions' };

/**
 * The session a choice opens. Everything is the format-based modes (a
 * whole-lecture shuffle, or just one kind); the others are the memory-based
 * modes, narrowed to a kind with `?kind=`.
 */
export function sessionFor(cards: Cards, kind: Kind): { mode: StudyMode; kind?: CardKind } {
  if (cards === 'everything') return { mode: MODES[kind] };
  return { mode: cards === 'due' ? 'review' : cards, kind: kind === 'all' ? undefined : kind };
}

/** The choice a practice session was opened with, read back from its mode and kind. */
export function choiceOf(mode: StudyMode, kind: CardKind | null): { cards: Cards; kind: Kind } | null {
  const memory: Partial<Record<StudyMode, Cards>> = { review: 'due', weakest: 'weakest', missed: 'missed' };
  if (memory[mode]) return { cards: memory[mode]!, kind: kind ?? 'all' };
  const format = (Object.keys(MODES) as Kind[]).find((k) => MODES[k] === mode);
  return format ? { cards: 'everything', kind: format } : null;
}

/** Where in a lecture: the whole of it, one section, or its studies ('all' or one study's key). */
export interface From {
  sectionId?: string;
  study?: string;
}

/**
 * What a lecture's counts need, worked out once rather than for each of the
 * sixteen choices: the studies filter scans every card, the exam rule every
 * exam.
 */
export interface CountBasis {
  course: Course;
  progress: Record<string, ItemResult>;
  missedIds: ReadonlySet<string>;
  exam: ExamRule;
  sectionId?: string;
  onlyIds?: ReadonlySet<string>;
  now: number;
}

export function countBasis(
  course: Course,
  progress: Record<string, ItemResult>,
  missedIds: ReadonlySet<string>,
  from: From,
  now: number,
): CountBasis {
  return { course, progress, missedIds, exam: examRule(course, progress, now), sectionId: from.sectionId, onlyIds: onlyStudies(course, from.study), now };
}

/** The list a choice gives in one lecture, by the call the session makes. */
function listOf(basis: CountBasis, cards: Cards, kind: Kind, minutes: number, pace?: Record<string, number>) {
  const { course, progress, missedIds, exam, sectionId, onlyIds, now } = basis;
  const s = sessionFor(cards, kind);
  if (onlyIds?.size === 0) return [];
  return buildSessionItems(course, s.mode, { progress, now, exam, minutes, pace, sectionId, onlyIds, kind: s.kind, missedIds });
}

const answered = (i: { type: string }) => i.type === 'mcq' || i.type === 'flashcard' || i.type === 'recall';

/** The cards a choice would give in one lecture to answer, all of them (unlimited minutes is how the app counts everything due). */
export function practiceCount(basis: CountBasis, cards: Cards, kind: Kind): number {
  return listOf(basis, cards, kind, Infinity).filter(answered).length;
}

/**
 * The sitting Start opens in one lecture, as it will be: the cards to
 * answer, which Due now fits to the student's daily time (the end of the
 * sitting offers the rest), and the cards to read along the way (worked
 * examples, figures, definitions), which the count beside each choice
 * leaves out. The page counted 637 and the sitting then said 670.
 */
export function sittingSize(basis: CountBasis, cards: Cards, kind: Kind, minutes: number, pace?: Record<string, number>): { answer: number; read: number } {
  const list = listOf(basis, cards, kind, minutes, pace);
  const answer = list.filter(answered).length;
  return { answer, read: list.length - answer };
}

/** How a class's Practice takes its lectures: one after another, or mixed in one sitting. */
export type Lectures = 'in-turn' | 'mixed';

export const LECTURES: { value: Lectures; label: string }[] = [
  { value: 'in-turn', label: 'One at a time' },
  { value: 'mixed', label: 'Mixed together' },
];

/**
 * The class's next exam when it is in the last week (`PROTECT_FROM_DAYS`,
 * when the exam starts steering Review), else null. `days` as daysToExam:
 * 0 on the day.
 */
export function examSoon(lectures: [string, Course][], now: number): { name: string; days: number } | null {
  const next = classExams(lectures, now)[0];
  const days = next ? daysToExam(next.date, now) : null;
  return next && days != null && days <= PROTECT_FROM_DAYS ? { name: next.name, days } : null;
}

/** A student's pick of how to take a class's lectures, and whether an exam was close when it was made. */
export interface LecturesPick {
  value: Lectures;
  nearExam: boolean;
}

/**
 * How a class's Practice takes its lectures: mixed together in the last
 * week before an exam, one at a time otherwise (the owner, 2026-10-19). An
 * exam mixes the lectures, and practice that mixes related topics did
 * better than one topic at a time (docs/evidence.md); the simulator found
 * mixing level over a finished sitting and reaching every lecture when one
 * is cut short (sim/FINDINGS.md, 2026-10-18). A pick holds in the situation
 * it was made in: one made in September does not keep exam week one at a
 * time, and one made in exam week does not outlast the exam.
 */
export function lecturesFor(pick: LecturesPick | null, nearExam: boolean): Lectures {
  if (pick && pick.nearExam === nearExam) return pick.value;
  return nearExam ? 'mixed' : 'in-turn';
}

/**
 * The link that starts a choice in one lecture. `classCode` marks a session
 * opened from a class's Practice, so its ways out lead back there; it carries
 * on through the class unless `single` (the choice was one lecture, or one
 * study in it). `mixed`: the class's lectures in one sitting instead
 * (lib/mixLectures), opened in this one.
 */
export function practiceLink(courseId: string, cards: Cards, kind: Kind, from: From, classCode?: string, single = false, mixed = false): string {
  const go = sessionFor(cards, kind);
  const query = new URLSearchParams();
  if (from.sectionId) query.set('section', from.sectionId);
  if (from.study) query.set('study', from.study);
  if (go.kind) query.set('kind', go.kind);
  if (classCode) query.set('class', classCode);
  if (classCode && single) query.set('single', '1');
  else if (classCode && mixed) query.set('mix', '1');
  const qs = query.toString();
  return `/session/${courseId}/${go.mode}${qs ? `?${qs}` : ''}`;
}
