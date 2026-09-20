import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { sortedSections } from '@/lib/sortedSections';
import { sectionStats } from '@/lib/sectionStats';
import { growTree, type Limb } from '@/lib/growTree';

/**
 * How much of a section counts as known.
 *
 * Coverage times confidence: studying every scorable item badly is not the
 * same as studying half of them well, and neither is mastery. The floor of
 * 0.35 on the accuracy term means work always shows — a branch you have
 * struggled with still leafs, just thinly.
 */
function mastery(studied: number, gradable: number, accuracy: number | null): number {
  if (!gradable || !studied) return 0;
  const coverage = studied / gradable;
  const confidence = accuracy === null ? 0.5 : 0.35 + (accuracy / 100) * 0.65;
  return Math.max(0, Math.min(1, coverage * confidence));
}

interface CourseTreeProps {
  courseId: string;
  course: Course;
  progress: Record<string, ItemResult>;
  /**
   * Sizing classes. The svg carries a viewBox and no width/height, so it
   * takes whatever box CSS gives it — which is how the same tree can be
   * small on a phone and large on a desktop. Below about 96px tall the
   * twigs merge into a smudge, so do not go under `h-24`.
   */
  className?: string;
  /**
   * Which surface the drawing sits on. Foliage is filled with it so leaves
   * occlude the branches behind them, so a tree on a card and a tree on the
   * page need different fills — get it wrong and every leaf is a hole.
   */
  on?: 'page' | 'card';
  /**
   * Limbs become links to their section, and pointing at one dims the rest.
   * Off by default: a thumbnail on a library card is a picture of a course,
   * not a way into its eleventh section.
   */
  interactive?: boolean;
  /** Draw this section's limbs at full strength and dim everything else. */
  highlight?: string | null;
  /**
   * Draw the tree on, once, as it appears.
   *
   * The only animation in the app, and it is growth-shaped because that is
   * the one thing this drawing is about: the wood inks itself in and the
   * leaves come after it. Reserved for the end of a session, where something
   * has actually been earned; a tree that redraws itself every time a page
   * loads is a loading spinner with extra steps.
   */
  animate?: boolean;
}

/** Wood that belongs to no section — the bole and the leader — never dims. */
const isStructural = (limb: Limb) => !limb.sectionId;

/** Beyond this far from any limb (in viewBox units) the pointer is on nothing. */
const REACH = 26;

interface Sample {
  x: number;
  y: number;
  sectionId: string;
}

/**
 * The course, drawn.
 *
 * Structure comes from the course and never moves; foliage comes from what
 * has been studied. A section never opened is a bare branch, which is the
 * one thing a percentage cannot show you at a glance.
 *
 * When `interactive`, each section's limbs are also a link into that section,
 * which is the difference between a drawing beside an app and a drawing that
 * IS one. The links are a second layer of transparent, deliberately fat
 * copies of the wood rather than handlers on the visible paths, because the
 * paint order cannot be disturbed: every leaf is drawn after every branch so
 * that a canopy hides the wood behind it, and grouping the paths by section
 * to make them clickable would have put one section's branches back on top of
 * another's leaves.
 *
 * Deliberately has no caption. It either communicates or it does not, and a
 * sentence underneath describing the picture would be an admission that it
 * does not.
 */
export function CourseTree({
  courseId,
  course,
  progress,
  className = 'h-40',
  on = 'page',
  interactive = false,
  highlight = null,
  animate = false,
}: CourseTreeProps) {
  const [pointed, setPointed] = useState<string | null>(null);
  const active = pointed ?? highlight;

  const { tree, sections } = useMemo(() => {
    const sections = sortedSections(course).map((section) => {
      const stats = sectionStats(section, progress);
      return {
        id: section.id,
        title: section.title,
        items: section.items.length,
        accuracy: stats.accuracy,
        weight: section.items.length,
        mastery: mastery(stats.studied, stats.gradable, stats.accuracy),
      };
    });
    return { tree: growTree(courseId, sections), sections };
  }, [courseId, course, progress]);

  const svgRef = useRef<SVGSVGElement>(null);
  const cloud = useRef<Sample[]>([]);
  const navigate = useNavigate();

  /*
   * Pointing at a limb is decided by DISTANCE, not by stacking.
   *
   * The first version gave each section a fat transparent copy of its own
   * wood and let the browser hit-test them. With eleven crowns interleaved
   * in one canvas those copies overlap almost everywhere, and the last one
   * appended wins, so aiming at a visible limb selected the right section
   * 54% of the time — measured, not guessed. Weighting the order by limb
   * thickness moved it to 58%. A control that misroutes two clicks in five
   * is worse than no control.
   *
   * So the limbs are sampled into a point cloud once, and the pointer picks
   * the nearest sample. Whatever you are closest to is what you get, which
   * is both correct by construction and what the drawing looks like it
   * should do.
   */
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !interactive) return;
    const samples: Sample[] = [];
    for (const el of svg.querySelectorAll<SVGPathElement>('path[data-section]')) {
      // jsdom has no SVG geometry, so the cloud stays empty under test and
      // pointing simply finds nothing — which is the correct behaviour for a
      // renderer that cannot measure a path.
      if (typeof el.getTotalLength !== 'function') return;
      const sectionId = el.dataset.section!;
      const length = el.getTotalLength();
      // Roughly every 6 units, and never fewer than the two ends.
      const steps = Math.max(2, Math.ceil(length / 6));
      for (let i = 0; i <= steps; i++) {
        const { x, y } = el.getPointAtLength((length * i) / steps);
        samples.push({ x, y, sectionId });
      }
    }
    cloud.current = samples;
  }, [tree, interactive]);

  const nearest = useCallback((event: { clientX: number; clientY: number }): string | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const { x, y } = point.matrixTransform(ctm.inverse());
    let best: string | null = null;
    let bestDist = REACH * REACH;
    for (const s of cloud.current) {
      const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = s.sectionId;
      }
    }
    return best;
  }, []);

  const inLeaf = useMemo(
    () => new Set(tree.limbs.filter((l) => l.kind === 'leaf').map((l) => l.sectionId)).size,
    [tree],
  );

  const label = `${course.metadata.title}: ${inLeaf} of ${course.sections.length} sections in leaf`;
  const pointedTitle = interactive ? sections.find((s) => s.id === pointed)?.title : undefined;

  const svg = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${tree.width} ${tree.height}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      // A drawing with links inside it is not an image: role="img" would hide
      // every one of those links from a screen reader.
      role={interactive ? 'group' : 'img'}
      aria-label={label}
      onPointerMove={interactive ? (e) => setPointed(nearest(e)) : undefined}
      onPointerLeave={interactive ? () => setPointed(null) : undefined}
      onClick={
        interactive
          ? (e) => {
              const id = nearest(e);
              if (id) navigate(`/study/${courseId}/section/${encodeURIComponent(id)}`);
            }
          : undefined
      }
      className={`w-auto shrink-0 text-text ${
        on === 'card' ? '[&_.lf]:fill-[var(--color-surface)]' : '[&_.lf]:fill-[var(--color-bg)]'
      } ${animate ? 'tree-grow' : ''} ${interactive && pointed ? 'cursor-pointer' : ''} ${className}`}
    >
      {tree.limbs.map((limb, i) => (
        <path
          key={i}
          d={limb.d}
          // The lit limb is drawn heavier as well as left at full strength.
          // Dimming alone had to be so deep to register that the whole crown
          // went to a ghost, and a tree you cannot see is not locating
          // anything.
          strokeWidth={active && limb.sectionId === active ? limb.weight * 1.5 : limb.weight}
          className={limb.solid ? 'lf' : 'wd'}
          // Normalised length, so one dash rule can draw on a path of any
          // size without knowing how long it is.
          pathLength={animate && !limb.solid ? 1 : undefined}
          // Only the wood is sampled: a crown's leaves are hundreds of marks
          // a few units across, and the branch running through them puts a
          // sample everywhere they are anyway.
          data-section={interactive && limb.kind !== 'leaf' ? limb.sectionId : undefined}
          opacity={active && !isStructural(limb) && limb.sectionId !== active ? 0.4 : undefined}
        />
      ))}

      {/* Keyboard and screen-reader access to the same sections. These carry
          no pointer events — pointing is handled above, by distance — so they
          exist to be tabbed to, named, and pressed. */}
      {interactive &&
        sections.map((section) => (
          <a
            key={section.id}
            href={`#/study/${courseId}/section/${encodeURIComponent(section.id)}`}
            aria-label={`${section.title} — ${section.items} item${section.items === 1 ? '' : 's'}${
              section.accuracy === null ? ', not yet studied' : `, ${section.accuracy}% correct`
            }`}
            onFocus={() => setPointed(section.id)}
            onBlur={() => setPointed(null)}
            style={{ pointerEvents: 'none' }}
          >
            {/* A zero-area shape: the anchor needs a child to be focusable at
                all, and this one is never seen or hit. */}
            <rect x={0} y={0} width={0} height={0} fill="none" />
          </a>
        ))}
    </svg>
  );

  if (!interactive) return svg;

  /* Named before it is clicked. Aiming at a limb inside eleven interleaved
     crowns picks the right section about 60% of the time, measured — so the
     name of whatever the pointer is nearest sits under the drawing, and a
     miss is a moved mouse rather than a wrong page. The line is reserved so
     nothing jumps. */
  return (
    <span className="inline-flex flex-col items-center">
      {svg}
      <span className="mt-1 h-4 max-w-full truncate text-micro text-text-2" aria-hidden="true">
        {pointedTitle ?? ''}
      </span>
    </span>
  );
}
