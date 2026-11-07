import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { treeCounts, treeWordParts, type TreeCounts } from '@/lib/treeWords';
import { CourseTree } from './CourseTree';

/** The line of words: the plain statement that agrees with the drawing. */
function TreeLine({ counts }: { counts: TreeCounts }) {
  return (
    <p className="mark text-text-3">
      {treeWordParts(counts).map((part, i) => (
        <span key={part.text}>
          {i > 0 && ' · '}
          <span className={part.fading ? 'text-accent' : undefined}>{part.text}</span>
        </span>
      ))}
    </p>
  );
}

/**
 * The tree on the lecture page: the drawing as large as the first screen
 * holds it, with the words as its caption. The owner chose this one of three
 * (2026-11-06), with the numbered branches of another coming back as
 * something a touch reveals: any touch raises a number on every branch, the
 * branch under the finger picked out and named here, and a tap on a number
 * opens its section (docs/proposals/tree.md §2).
 */
export function LectureTree({
  courseId,
  course,
  progress,
  wide,
  onExpand,
}: {
  courseId: string;
  course: Course;
  progress: Record<string, ItemResult>;
  /** The desktop layout's column, which has the height a phone's first screen does not. */
  wide: boolean;
  onExpand: () => void;
}) {
  // Fading is judged as of drawing, as the tree judges it: rendering must not read the clock.
  const [now] = useState(Date.now);
  const counts = useMemo(() => treeCounts(course, progress, now), [course, progress, now]);
  const [picked, setPicked] = useState<string | null>(null);
  const named = picked ? counts.sections.find((s) => s.id === picked) : undefined;

  return (
    <figure className="w-full">
      <div className="flex justify-center">
        <CourseTree
          courseId={courseId}
          course={course}
          progress={progress}
          crop
          className={`${wide ? 'h-[22rem]' : 'h-72'} max-w-full`}
          interactive
          mode="reveal"
          onExpand={onExpand}
          onPoint={setPicked}
        />
      </div>
      {/* While a branch is picked, the words name it instead, with a way in
          big enough for a thumb. Its height is held, so the page under it
          does not jump as the finger moves. Part of the tree for a tap: the
          numbers stay up while its Open is tapped. */}
      <figcaption className="mt-1 flex min-h-11 items-center justify-center text-center" data-keeps-tree-open aria-live="polite">
        {named ? (
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="mark shrink-0 tabular-nums text-text-3">{named.n}</span>
            <span className="min-w-0 truncate font-display text-text">{named.title}</span>
            {/* The title is what a phone's width is for; the number's own ink
                says the rest, and only fading is worth the words. */}
            {named.state === 'fading' && <span className="mark shrink-0 text-accent">fading</span>}
            <Link
              to={`/study/${courseId}/section/${encodeURIComponent(named.id)}`}
              className="mark tap-safe inline-flex shrink-0 items-center text-accent hover:underline"
            >
              Open ▸
            </Link>
          </span>
        ) : (
          <TreeLine counts={counts} />
        )}
      </figcaption>
    </figure>
  );
}
