import { Link } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { isWrittenExample } from '@/lib/answerPoints';
import { choiceLink } from '@/lib/practice';
import { kindOfItem, PRACTICE_KINDS, WHICH, type PracticeKind } from '@/lib/practiceChoice';
import { recallId, scoredEntries } from '@/lib/scored';

/**
 * One kind of card at a time, one tap from the lecture or section page:
 * every multiple-choice question, every flashcard, every written answer,
 * every term, every problem, or a practice test. The owner looked for these
 * for weeks inside the Practice page (2026-10-26: "why is there not a mode
 * to just practice flash cards or just do multiple choice problems?").
 * Each starts at once, in the lecture's order; the Practice page builds
 * anything else.
 */
export function PracticeKinds({ courseId, course, sectionId }: { courseId: string; course: Course; sectionId?: string }) {
  const items = course.sections.filter((s) => !sectionId || s.id === sectionId).flatMap((s) => s.items);
  const scored = new Set(scoredEntries(items).map((e) => e.id));
  const n = new Map<PracticeKind, number>();
  for (const i of items) {
    if (i.type === 'definition' ? !scored.has(recallId(i.id)) : !scored.has(i.id)) continue;
    const k = isWrittenExample(i) ? 'written' : kindOfItem(i);
    if (k) n.set(k, (n.get(k) ?? 0) + 1);
  }
  const kinds = PRACTICE_KINDS.filter((k) => (n.get(k.value) ?? 0) > 0);
  if (!kinds.length) return null;
  const test = `/study/${courseId}/test${sectionId ? `?section=${encodeURIComponent(sectionId)}` : ''}`;

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-small">
      {kinds.map((k) => (
        <Link
          key={k.value}
          to={choiceLink(courseId, {
            kinds: [k.value],
            which: WHICH.map((w) => w.value),
            order: 'inorder',
            ...(sectionId ? { where: { [courseId]: [sectionId] } } : {}),
          })}
          className="tap-safe text-text-2 underline-offset-4 hover:text-text hover:underline"
        >
          {k.label} <span className="text-xs tabular-nums text-text-3">{n.get(k.value)}</span>
        </Link>
      ))}
      {kinds.some((k) => k.value !== 'terms' && k.value !== 'flashcards') && (
        <Link to={test} className="tap-safe text-text-2 underline-offset-4 hover:text-text hover:underline">
          Practice test
        </Link>
      )}
    </div>
  );
}
