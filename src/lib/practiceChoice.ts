import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import type { AnyItem } from './buildSessionItems';
import { answerPoints, isWrittenExample } from './answerPoints';

/**
 * A Practice sitting, as the student builds it (docs/proposals/practice.md):
 * which kinds of card, which of them by how well they are known, in what
 * order, from which sections of which lectures. Kinds, which cards and where
 * are ticks, since they combine into a bigger set ("boxes to tick … so
 * multiple different things can be selected", the owner, 2026-11-03); the
 * order is one of three ways of ordering that set.
 */
export type PracticeKind = 'questions' | 'flashcards' | 'written' | 'terms' | 'problems';
export type Which = 'due' | 'missed' | 'new' | 'strong';
export type Order = 'mixed' | 'inorder' | 'weakest';

export const PRACTICE_KINDS: { value: PracticeKind; label: string }[] = [
  { value: 'questions', label: 'Multiple choice' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'written', label: 'Written answers' },
  { value: 'terms', label: 'Terms' },
  { value: 'problems', label: 'Problems' },
];

export const WHICH: { value: Which; label: string }[] = [
  { value: 'due', label: 'Due now' },
  { value: 'missed', label: 'Mistakes' },
  { value: 'new', label: 'New' },
  { value: 'strong', label: 'Already strong' },
];

export const ORDERS: { value: Order; label: string; use: string }[] = [
  { value: 'mixed', label: 'Mixed', use: 'Shuffled together, the way an exam mixes them.' },
  { value: 'inorder', label: 'In order', use: 'As the lectures teach them, section by section.' },
  { value: 'weakest', label: 'Weakest first', use: 'What you know least first, for extra time after Today.' },
];

export interface PracticeChoice {
  kinds: PracticeKind[];
  which: Which[];
  order: Order;
  /**
   * The sections chosen, by lecture: a lecture's list, or 'all' of it. A
   * lecture not listed is left out. Absent: every section of every lecture.
   */
  where?: Record<string, string[] | 'all'>;
  /** Only the cards on empirical studies: 'all', or one study's key (lib/studies). */
  study?: string | null;
  /**
   * At most this many cards never answered, after every card already met:
   * the ready-made Flashcards sitting, Anki's way (due first, then a few
   * new; docs/proposals/practice.md). No limit when absent.
   */
  newCap?: number;
}

const KIND_SET = new Set<string>(PRACTICE_KINDS.map((k) => k.value));
const WHICH_SET = new Set<string>(WHICH.map((w) => w.value));
const ORDER_SET = new Set<string>(ORDERS.map((o) => o.value));

/** The kind a card is practised as: a written answer is its own, apart from flashcards. */
export function kindOfItem(item: AnyItem): PracticeKind | null {
  switch (item.type) {
    case 'mcq':
      return 'questions';
    case 'flashcard':
      return answerPoints(item) ? 'written' : 'flashcards';
    case 'recall':
    case 'definition':
      return 'terms';
    case 'problem':
      return 'problems';
    default:
      return null;
  }
}

/** Where a studied card stands: never answered, a mistake still standing, due, or none of those. */
export function whichOf(
  item: { id: string },
  progress: Record<string, ItemResult> | undefined,
  missedIds: ReadonlySet<string> | undefined,
  due: (id: string) => boolean,
): Set<Which> {
  const r = progress?.[item.id];
  const out = new Set<Which>();
  if (!r || r.got + r.missed === 0) {
    out.add('new');
    return out;
  }
  if (missedIds?.has(item.id)) out.add('missed');
  if (due(item.id)) out.add('due');
  if (!out.size) out.add('strong');
  return out;
}

/** The sections of one lecture a choice keeps, or null for all of them; an empty set leaves the lecture out. */
export function sectionsFor(choice: PracticeChoice, courseId: string): ReadonlySet<string> | null {
  if (!choice.where) return null;
  const w = choice.where[courseId];
  if (w === 'all') return null;
  return new Set(w ?? []);
}

/** The choice, for a link: a URL can carry it to the session, and a reload keeps it. */
export function encodeChoice(choice: PracticeChoice): string {
  return JSON.stringify(choice);
}

/** A choice read back from a link, each part checked, or null when nothing usable is there. */
export function decodeChoice(raw: string | null): PracticeChoice | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<PracticeChoice>;
    if (!v || typeof v !== 'object') return null;
    const kinds = (Array.isArray(v.kinds) ? v.kinds : []).filter((k): k is PracticeKind => KIND_SET.has(String(k)));
    const which = (Array.isArray(v.which) ? v.which : []).filter((w): w is Which => WHICH_SET.has(String(w)));
    if (!kinds.length || !which.length) return null;
    const order = ORDER_SET.has(String(v.order)) ? (v.order as Order) : 'mixed';
    let where: PracticeChoice['where'];
    if (v.where && typeof v.where === 'object') {
      where = {};
      for (const [lid, s] of Object.entries(v.where)) {
        if (s === 'all') where[lid] = 'all';
        else if (Array.isArray(s)) where[lid] = s.filter((x): x is string => typeof x === 'string');
      }
    }
    const study = typeof v.study === 'string' ? v.study : null;
    const newCap = Number.isInteger(v.newCap) && v.newCap! > 0 && v.newCap! <= 100 ? v.newCap : undefined;
    return { kinds, which, order, ...(where ? { where } : {}), ...(study ? { study } : {}), ...(newCap ? { newCap } : {}) };
  } catch {
    return null;
  }
}

/** Every kind of card a lecture has, in PRACTICE_KINDS order. */
export function kindsIn(courses: Course[]): PracticeKind[] {
  const have = new Set<PracticeKind>();
  for (const c of courses)
    for (const s of c.sections)
      for (const i of s.items) {
        if (i.set_aside) continue;
        const k = isWrittenExample(i) ? 'written' : kindOfItem(i);
        if (k) have.add(k);
      }
  return PRACTICE_KINDS.map((k) => k.value).filter((k) => have.has(k));
}
