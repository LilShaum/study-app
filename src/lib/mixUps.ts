import type { Course, DefinitionItem, McqItem } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { acceptedForms, normalise } from './typedAnswer';

/**
 * Mix-ups: a wrong answer that names another term the lecture teaches.
 *
 * A typed answer that names the wrong term was already kept (RecallCard,
 * `confusedWith`) and brought back beside the term it was taken for
 * (buildSessionItems pairConfusions). A multiple-choice pick says the same
 * when the option picked is another term the lecture defines: the student
 * took one for the other. Kept the same way, until the card is right on a
 * later day, so Review asks that term straight after the question (the
 * owner, 2026-10-17 and 10-20: wrong options that show a gap in what you
 * know; docs/evidence.md on contrasting confusable things).
 */

const FORMS = new WeakMap<Course, Map<string, DefinitionItem>>();

function definitionsByName(course: Course): Map<string, DefinitionItem> {
  const cached = FORMS.get(course);
  if (cached) return cached;
  const byName = new Map<string, DefinitionItem>();
  for (const section of course.sections)
    for (const item of section.items)
      if (item.type === 'definition') for (const f of acceptedForms(item)) if (!byName.has(f.norm)) byName.set(f.norm, item);
  FORMS.set(course, byName);
  return byName;
}

/** The definition a wrong pick names, when it is a term of this lecture other than the right answer's. */
export function termPicked(course: Course, item: McqItem, picked: number): string | undefined {
  if (picked === item.correct_index) return undefined;
  const pick = item.options?.[picked];
  if (!pick) return undefined;
  const byName = definitionsByName(course);
  const named = byName.get(normalise(pick));
  if (!named) return undefined;
  const right = item.options?.[item.correct_index];
  return right && byName.get(normalise(right))?.id === named.id ? undefined : named.id;
}

export interface MixUp {
  /** The card's id in the lecture. */
  id: string;
  /** What was asked, as the student would name it: the term, or the question. */
  asked: string;
  /** The terms taken for it. */
  with: string[];
  at: number;
}

/** Every card with a mix-up on record, latest first. */
export function mixUps(course: Course, progress: Record<string, ItemResult>): MixUp[] {
  const items = new Map(course.sections.flatMap((s) => s.items).map((i) => [i.id, i]));
  const termOf = (id: string) => {
    const d = items.get(id);
    return d?.type === 'definition' ? d.term : undefined;
  };
  const out: MixUp[] = [];
  for (const [id, r] of Object.entries(progress)) {
    if (!r.confusedWith?.length) continue;
    const names = r.confusedWith.map(termOf).filter((t): t is string => !!t);
    if (!names.length) continue;
    // A typed term's record is under its recall id (lib/scored recallId).
    const base = items.get(id) ?? items.get(id.replace(/~recall$/, ''));
    const asked =
      base?.type === 'definition'
        ? base.term
        : base?.type === 'mcq'
          ? base.question
          : undefined;
    if (!asked) continue;
    out.push({ id, asked, with: names, at: r.lastSeen ?? 0 });
  }
  return out.sort((a, b) => b.at - a.at);
}
