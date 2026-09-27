import type { ReactNode } from 'react';
import type { Course } from '@/schema/course';
import type { SessionItem } from '@/lib/buildSessionItems';

interface Part {
  label: string;
  start: number;
  end: number;
}

/**
 * The sitting cut into the parts it is made of: Today's review block, then
 * each Learn step (or, in the other modes, each section), in order.
 */
function partsOf(items: SessionItem[], course: Course): Part[] {
  const titles = new Map(course.sections.map((s) => [s.id, s.title]));
  const parts: Part[] = [];
  items.forEach((item, i) => {
    const label =
      item._block === 'review'
        ? 'Review'
        : item._step !== undefined
          ? `${titles.get(item._sectionId) ?? 'Section'} · step ${item._step + 1}`
          : (titles.get(item._sectionId) ?? 'Section');
    const last = parts[parts.length - 1];
    if (last && last.label === label && last.end === i) last.end = i + 1;
    else parts.push({ label, start: i, end: i + 1 });
  });
  return parts;
}

interface SessionRailProps {
  items: SessionItem[];
  index: number;
  course: Course;
  score: { got: number; missed: number };
  hints: { keys: string[]; label: string }[];
  /** Drawn at the top of the rail: the course's tree. */
  figure?: ReactNode;
}

/**
 * The margin of the study screen on a wide display: what the sitting is made
 * of and where you are in it, the score, and the keys. A phone shows the card
 * alone; a desktop had the same narrow column with empty width either side.
 */
export function SessionRail({ items, index, course, score, hints, figure }: SessionRailProps) {
  const parts = partsOf(items, course);
  const answered = score.got + score.missed;
  return (
    <aside className="hidden text-small lg:block" aria-label="This sitting">
      <div className="sticky top-6 space-y-8">
        {figure && <div aria-hidden="true">{figure}</div>}
        {parts.length > 1 && (
          <section>
            <h2 className="mark mb-2 text-text-3">This sitting</h2>
            <ol className="space-y-1.5">
              {parts.map((p) => {
                const done = index >= p.end;
                const here = index >= p.start && index < p.end;
                return (
                  <li key={`${p.label}-${p.start}`} className="flex items-baseline gap-2">
                    <span
                      className={`min-w-0 flex-1 truncate ${here ? 'text-text' : done ? 'text-text-3 line-through decoration-border-strong' : 'text-text-2'}`}
                    >
                      {p.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-text-3">
                      {here ? `${index - p.start + 1}/${p.end - p.start}` : p.end - p.start}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <section>
          <h2 className="mark mb-2 text-text-3">So far</h2>
          <p className="tabular-nums text-text-2">
            <span className="text-success">{score.got} right</span>
            <span className="text-text-3"> · </span>
            <span className="text-error">{score.missed} missed</span>
            {answered > 0 && <span className="text-text-3"> · {Math.round((score.got / answered) * 100)}%</span>}
          </p>
        </section>

        {hints.length > 0 && (
          <section className="hidden [@media(hover:hover)]:block">
            <h2 className="mark mb-2 text-text-3">Keys</h2>
            <ul className="space-y-1.5 text-xs text-text-3">
              {hints.map((hint) => (
                <li key={hint.keys.join()} className="flex items-center gap-1.5">
                  {hint.keys.map((k) => (
                    <kbd key={k} className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px]">
                      {k}
                    </kbd>
                  ))}
                  <span>{hint.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
