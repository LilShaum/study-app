import { useMemo, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { growTree } from '@/lib/growTree';
import { sortedSections } from '@/lib/sortedSections';
import { placeTreeKeys } from '@/lib/treeKeys';
import { treeCounts, treeWordParts, type SectionState, type TreeCounts, type TreeVersion } from '@/lib/treeWords';
import { CourseTree } from './CourseTree';

/** Version 3: the fading sections its key names before it hands over to Progress. */
const KEY_ROWS = 3;

/** How close a tap must land to a number, in screen pixels, to mean it. */
const TAP_REACH_PX = 26;

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

/** A number's ink: what is fading is marked, a bare branch recedes. Tokens, as everything is. */
const KEY_FILL: Record<SectionState, string> = {
  fading: 'var(--color-accent)',
  held: 'var(--color-text)',
  bare: 'var(--color-text-3)',
};

/**
 * Version 2, the map: the drawing with each branch numbered, as a botanical
 * plate keys its parts. A tap near a number opens that section; a tap anywhere
 * else on the drawing opens the large tree. See lib/treeKeys for why numbers
 * rather than the limbs themselves.
 */
function TreeMap({
  courseId,
  course,
  progress,
  counts,
  size,
  onExpand,
}: {
  courseId: string;
  course: Course;
  progress: Record<string, ItemResult>;
  counts: TreeCounts;
  size: string;
  onExpand: () => void;
}) {
  const navigate = useNavigate();
  const { keys, width, height } = useMemo(() => {
    // Only the wood is wanted, and it does not depend on what has been learned.
    const sections = sortedSections(course).map((s) => ({ id: s.id, weight: s.items.length, mastery: 0 }));
    const tree = growTree(courseId, sections);
    return { keys: placeTreeKeys(tree, sections.map((s) => s.id)), width: tree.width, height: tree.height };
  }, [courseId, course]);
  const bySection = new Map(counts.sections.map((s) => [s.id, s]));

  const tapped = (e: MouseEvent<SVGSVGElement>) => {
    // From the keyboard: the number's own link has it.
    if (e.detail === 0) return;
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const { x, y } = point.matrixTransform(ctm.inverse());
    const reach = TAP_REACH_PX / (Math.hypot(ctm.a, ctm.b) || 1);
    let best: string | null = null;
    let bestDistance = reach;
    for (const k of keys) {
      const distance = Math.hypot(k.at.x - x, k.at.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = k.sectionId;
      }
    }
    if (best) navigate(`/study/${courseId}/section/${encodeURIComponent(best)}`);
    else onExpand();
  };

  return (
    <div className={`relative ${size}`} style={{ aspectRatio: `${width} / ${height}` }}>
      <CourseTree courseId={courseId} course={course} progress={progress} className="h-full" />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full cursor-pointer overflow-visible"
        role="group"
        aria-label="The sections, numbered on the tree"
        onClick={tapped}
      >
        {keys.map((k) => {
          const section = bySection.get(k.sectionId);
          const state = section?.state ?? 'bare';
          // The label carries the state, so what the mark says is not colour alone.
          const said = state === 'bare' ? 'not started' : state === 'fading' ? `fading, ${section?.held}% still held` : 'still held';
          return (
            // Pointing is by distance (above), so these exist to be tabbed to and named.
            <a
              key={k.sectionId}
              href={`#/study/${courseId}/section/${encodeURIComponent(k.sectionId)}`}
              aria-label={`Section ${k.n}, ${section?.title ?? ''}: ${said}`}
              style={{ pointerEvents: 'none' }}
            >
              <path d={`M${k.tip.x} ${k.tip.y}L${k.at.x} ${k.at.y}`} stroke="var(--color-text-3)" strokeWidth={0.5} fill="none" />
              <text
                x={k.at.x}
                y={k.at.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={state === 'fading' ? 14 : 12}
                fontWeight={state === 'fading' ? 700 : 500}
                // Set on the paper, so a number reads over the leaves behind it.
                style={{
                  fontFamily: 'var(--font-display)',
                  fill: KEY_FILL[state],
                  stroke: 'var(--color-bg)',
                  strokeWidth: 3.5,
                  paintOrder: 'stroke',
                  fontVariantNumeric: 'lining-nums',
                }}
              >
                {k.n}
              </text>
            </a>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * The tree on the lecture page, in three versions for the owner to choose
 * between. They asked for the tree to be updated and have not yet said whether
 * that means its look, its size or what it shows, so these answer differently
 * and are looked at before one is kept (docs/proposals/design-audit.md §4).
 * Each says the same line of words. When one is chosen, this file loses the
 * other two.
 *
 *   1. PLATE. The drawing alone, as large as the first screen can hold it, with
 *      the words as its caption. A tap opens the large tree. Changes the size.
 *   2. MAP. The drawing with every branch numbered, what is fading marked, the
 *      numbers matching the Sections list. A tap on a number opens that
 *      section. Changes what it shows, and is the proposal's pick.
 *   3. KEY. The drawing beside a legend that names the fading sections, each a
 *      tap to its Review. Changes what it is for: a way in, not only a picture.
 */
export function LectureTree({
  courseId,
  course,
  progress,
  version,
  wide,
  onExpand,
}: {
  courseId: string;
  course: Course;
  progress: Record<string, ItemResult>;
  version: TreeVersion;
  /** The desktop layout's column, which has the height a phone's first screen does not. */
  wide: boolean;
  onExpand: () => void;
}) {
  // Fading is judged as of drawing, as the tree judges it: rendering must not read the clock.
  const [now] = useState(Date.now);
  const counts = useMemo(() => treeCounts(course, progress, now), [course, progress, now]);
  const preview = (size: string) => (
    <CourseTree courseId={courseId} course={course} progress={progress} className={size} interactive mode="preview" onExpand={onExpand} />
  );

  if (version === 3) {
    return (
      <div className={`flex w-full items-start gap-4 ${wide ? 'flex-col' : ''}`}>
        {preview(wide ? 'h-[22rem]' : 'h-44')}
        <div className="w-full min-w-0 flex-1">
          <TreeLine counts={counts} />
          {counts.fading.length > 0 ? (
            <>
              <ul className="mt-2 border-t border-border">
                {counts.fading.slice(0, KEY_ROWS).map((s) => (
                  <li key={s.id} className="border-b border-border">
                    <Link
                      to={`/session/${courseId}/review?section=${encodeURIComponent(s.id)}`}
                      className="group tap-safe flex items-baseline gap-2 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-small text-text group-hover:text-accent">{s.title}</span>
                      <span className="mark shrink-0 tabular-nums text-accent">Review {s.due}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {counts.fading.length > KEY_ROWS && (
                <Link to={`/study/${courseId}/progress`} className="mark tap-safe mt-1 inline-flex items-center text-text-3 hover:text-text">
                  {counts.fading.length - KEY_ROWS} more ▸
                </Link>
              )}
            </>
          ) : (
            <p className="mt-2 text-small text-text-2">
              {counts.bare > 0 ? 'Today carries on with new material.' : 'All of it is still held.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <figure className="w-full">
      <div className="flex justify-center">
        {version === 2 ? (
          <TreeMap
            courseId={courseId}
            course={course}
            progress={progress}
            counts={counts}
            size={wide ? 'h-[26rem]' : 'h-64'}
            onExpand={onExpand}
          />
        ) : (
          preview(wide ? 'h-[26rem]' : 'h-72')
        )}
      </div>
      <figcaption className="mt-2 text-center">
        <TreeLine counts={counts} />
      </figcaption>
    </figure>
  );
}
