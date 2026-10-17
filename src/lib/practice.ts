import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { buildSessionItems, type CardKind, type StudyMode } from './buildSessionItems';
import { examRule, type ExamRule } from './exam';
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

/** The cards a choice would give in one lecture, counted by the call the session makes. */
export function practiceCount(basis: CountBasis, cards: Cards, kind: Kind): number {
  const { course, progress, missedIds, exam, sectionId, onlyIds, now } = basis;
  const s = sessionFor(cards, kind);
  if (onlyIds?.size === 0) return 0;
  return buildSessionItems(course, s.mode, {
    progress,
    now,
    exam,
    // Unlimited minutes is how the app counts everything due.
    minutes: Infinity,
    sectionId,
    onlyIds,
    kind: s.kind,
    missedIds,
  }).filter((i) => i.type === 'mcq' || i.type === 'flashcard' || i.type === 'recall').length;
}

/**
 * The link that starts a choice in one lecture. `classCode` marks a session
 * opened from a class's Practice, so its ways out lead back there; it carries
 * on through the class unless `single` (the choice was one lecture, or one
 * study in it).
 */
export function practiceLink(courseId: string, cards: Cards, kind: Kind, from: From, classCode?: string, single = false): string {
  const go = sessionFor(cards, kind);
  const query = new URLSearchParams();
  if (from.sectionId) query.set('section', from.sectionId);
  if (from.study) query.set('study', from.study);
  if (go.kind) query.set('kind', go.kind);
  if (classCode) query.set('class', classCode);
  if (classCode && single) query.set('single', '1');
  const qs = query.toString();
  return `/session/${courseId}/${go.mode}${qs ? `?${qs}` : ''}`;
}
