import { RichText } from './RichText';

/**
 * The explanation a question rests on (an `explain` item, lib/learnSteps
 * explanationFor), under its answer: open after a miss, where the why is
 * most needed and Today never showed it; folded as "Why" after a right
 * answer, for the curious and for a right guess (docs/proposals/understanding.md).
 */
export function IdeaNote({ idea, open = false }: { idea?: { title: string; text: string } | null; open?: boolean }) {
  if (!idea?.text?.trim()) return null;
  return (
    <details open={open} className="group/idea mt-3 border-t border-border-light pt-2">
      <summary className="tap-safe flex cursor-pointer list-none items-center text-xs text-text-3 hover:text-text-2">
        <span className="group-open/idea:hidden">Why ▸</span>
        <span className="hidden group-open/idea:inline">Why ▾</span>
      </summary>
      <p className="mt-1.5 text-small text-text-2">
        {idea.title && <span className="font-semibold text-text">{idea.title}. </span>}
        <RichText text={idea.text} />
      </p>
    </details>
  );
}
