import { Link } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { isWrittenExample } from '@/lib/answerPoints';
import { practiceLink, type Kind } from '@/lib/practice';
import { recallId, scoredEntries } from '@/lib/scored';

/**
 * One kind of card at a time, one tap from the lecture or section page:
 * every multiple-choice question, every flashcard, every term, or a
 * practice test. These were on the Practice page all along, as "Kind", and
 * the owner looked for them for weeks without finding them (2026-10-26:
 * "why is there not a mode to just practice flash cards or just do multiple
 * choice problems?"). Each starts straight away; the Practice page keeps
 * the finer choices.
 */
export function PracticeKinds({ courseId, course, sectionId }: { courseId: string; course: Course; sectionId?: string }) {
  const items = course.sections.filter((s) => !sectionId || s.id === sectionId).flatMap((s) => s.items);
  const scored = new Set(scoredEntries(items).map((e) => e.id));
  const n: Record<Exclude<Kind, 'all'>, number> = {
    questions: items.filter((i) => i.type === 'mcq' && scored.has(i.id)).length,
    flashcards: items.filter((i) => (i.type === 'flashcard' || isWrittenExample(i)) && scored.has(i.id)).length,
    terms: items.filter((i) => i.type === 'definition' && scored.has(recallId(i.id))).length,
  };
  const kinds = (
    [
      ['questions', 'Multiple choice'],
      ['flashcards', 'Flashcards'],
      ['terms', 'Terms'],
    ] as const
  ).filter(([kind]) => n[kind] > 0);
  if (!kinds.length) return null;
  const test = `/study/${courseId}/test${sectionId ? `?section=${encodeURIComponent(sectionId)}` : ''}`;

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-small">
      {kinds.map(([kind, label]) => (
        <Link
          key={kind}
          to={practiceLink(courseId, 'everything', kind, { sectionId })}
          className="tap-safe text-text-2 underline-offset-4 hover:text-text hover:underline"
        >
          {label} <span className="text-xs tabular-nums text-text-3">{n[kind]}</span>
        </Link>
      ))}
      {n.questions + n.flashcards > 0 && (
        <Link to={test} className="tap-safe text-text-2 underline-offset-4 hover:text-text hover:underline">
          Practice test
        </Link>
      )}
    </div>
  );
}
