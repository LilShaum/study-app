import { useMemo } from 'react';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { sortedSections } from '@/lib/sortedSections';
import { sectionStats } from '@/lib/sectionStats';
import { growTree } from '@/lib/growTree';

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
}

/**
 * The course, drawn.
 *
 * Structure comes from the course and never moves; foliage comes from what
 * has been studied. A section never opened is a bare branch, which is the
 * one thing a percentage cannot show you at a glance.
 *
 * Deliberately has no caption. It either communicates or it does not, and a
 * sentence underneath describing the picture would be an admission that it
 * does not.
 */
export function CourseTree({ courseId, course, progress, className = 'h-40', on = 'page' }: CourseTreeProps) {
  const tree = useMemo(() => {
    const sections = sortedSections(course).map((section) => {
      const stats = sectionStats(section, progress);
      return {
        id: section.id,
        weight: section.items.length,
        mastery: mastery(stats.studied, stats.gradable, stats.accuracy),
      };
    });
    return growTree(courseId, sections);
  }, [courseId, course, progress]);

  const inLeaf = useMemo(
    () => new Set(tree.limbs.filter((l) => l.kind === 'leaf').map((l) => l.sectionId)).size,
    [tree],
  );

  return (
    <svg
      viewBox={`0 0 ${tree.width} ${tree.height}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={`${course.metadata.title}: ${inLeaf} of ${course.sections.length} sections in leaf`}
      className={`w-auto shrink-0 text-text ${
        on === 'card' ? '[&_.lf]:fill-[var(--color-surface)]' : '[&_.lf]:fill-[var(--color-bg)]'
      } ${className}`}
    >
      {tree.limbs.map((limb, i) => (
        <path key={i} d={limb.d} strokeWidth={limb.weight} className={limb.solid ? 'lf' : undefined} />
      ))}
    </svg>
  );
}
