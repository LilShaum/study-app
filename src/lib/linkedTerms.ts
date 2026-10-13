import type { Course, StudyItem } from '@/schema/course';
import { questionOverlap } from './contentChecks';
import { recallId } from './scored';
import { normaliseTerm } from './termMatch';

/**
 * One term taught in two lectures, scored once.
 *
 * The owner's biology lectures each open with the same basics: homeostasis,
 * feedback loop, effector, sensor (21 terms are defined in both Cell
 * Signaling and Endocrinology). Scored separately, every lecture taught and
 * tested them again as new, and the student spent their sittings on feedback
 * loops. Typing a term in one lecture now counts for the same term in the
 * others: Learn treats it as met, and Review brings it back once.
 *
 * The same name is not enough ("conditioning" in psychology and in exercise
 * science): the two definitions must also say much the same thing.
 */

type Def = Extract<StudyItem, { type: 'definition' }>;

/** Same name (brackets aside, singular or plural), and definitions that share most of their words. */
export function sameTerm(a: Def, b: Def): boolean {
  const name = (d: Def) => normaliseTerm(d.term.replace(/\([^)]*\)/g, ' ')).replace(/s$/, '');
  if (!name(a) || name(a) !== name(b)) return false;
  return questionOverlap({ question: a.definition, answer: '' }, { question: b.definition, answer: '' }).share >= 0.4;
}

const cache = new WeakMap<Record<string, Course>, Map<string, { courseId: string; id: string }[]>>();

/** The scored ids (typed-term records) of the same term in the other lectures, keyed by `${courseId}|${recallId}`. */
function index(courses: Record<string, Course>): Map<string, { courseId: string; id: string }[]> {
  const hit = cache.get(courses);
  if (hit) return hit;
  const defs = Object.entries(courses).flatMap(([courseId, c]) =>
    c.sections.flatMap((s) => s.items.filter((i): i is Def => i.type === 'definition' && !i.set_aside).map((d) => ({ courseId, d }))),
  );
  const byName = new Map<string, typeof defs>();
  for (const x of defs) {
    const k = normaliseTerm(x.d.term.replace(/\([^)]*\)/g, ' ')).replace(/s$/, '');
    byName.set(k, [...(byName.get(k) ?? []), x]);
  }
  const out = new Map<string, { courseId: string; id: string }[]>();
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    for (const a of group) {
      const twins = group.filter((b) => b.courseId !== a.courseId && sameTerm(a.d, b.d)).map((b) => ({ courseId: b.courseId, id: recallId(b.d.id) }));
      if (twins.length) out.set(`${a.courseId}|${recallId(a.d.id)}`, twins);
    }
  }
  cache.set(courses, out);
  return out;
}

/** Where else a typed-term answer counts: the same term in the student's other lectures. */
export function twinsOf(courses: Record<string, Course>, courseId: string, scoredId: string): { courseId: string; id: string }[] {
  return index(courses).get(`${courseId}|${scoredId}`) ?? [];
}
