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
  /** The course's tree, large, at the top of the left margin. */
  figure?: ReactNode;
  /** List the parts of the sitting (off for a class's mixed Practice). */
  parts?: boolean;
}

/**
 * The left margin of the study screen on a wide display: the tree and where
 * you are in it, what the sitting is made of, and the score. A phone shows the
 * card alone. The keys are one line under the card, not here.
 */
export function SessionRail({ items, index, course, score, figure, parts: showParts = true }: SessionRailProps) {
  const parts = showParts ? partsOf(items, course) : [];
  const answered = score.got + score.missed;
  return (
    <aside className="hidden text-small wide:block" aria-label="This sitting">
      <div className="sticky top-6 max-h-[calc(100vh-3rem)] space-y-8 overflow-y-auto">
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

      </div>
    </aside>
  );
}
