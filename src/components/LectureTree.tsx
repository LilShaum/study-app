import { useMemo, useState } from 'react';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { growTree } from '@/lib/growTree';
import { sortedSections } from '@/lib/sortedSections';
import { plateTop } from '@/lib/treeKeys';
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
 * holds it, with the words as its caption, and a tap opening the large tree.
 * The owner chose this one of three (2026-11-06; docs/proposals/design-audit.md
 * §4), with the numbered branches of another to come back as something a
 * touch reveals (docs/ASKS.md).
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
  // The sheet starts at the crown, so the drawing has the whole of its box.
  const top = useMemo(
    () => plateTop(growTree(courseId, sortedSections(course).map((s) => ({ id: s.id, weight: s.items.length, mastery: 0 })))),
    [courseId, course],
  );

  return (
    <figure className="w-full">
      <div className="flex justify-center">
        <CourseTree
          courseId={courseId}
          course={course}
          progress={progress}
          viewTop={top}
          className={`${wide ? 'h-[22rem]' : 'h-72'} max-w-full`}
          interactive
          mode="preview"
          onExpand={onExpand}
        />
      </div>
      <figcaption className="mt-2 text-center">
        <TreeLine counts={counts} />
      </figcaption>
    </figure>
  );
}
