import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { examRule } from './exam';
import { sectionMemory } from './sectionMemory';
import { sortedSections } from './sortedSections';

/**
 * Which version of the tree the lecture page draws (components/LectureTree).
 * Three are built and none is chosen: the owner picks, with the switch at the
 * top of the lecture page (docs/proposals/design-audit.md §4). With nothing
 * tapped yet it shows the first, for no better reason than that it is first.
 */
export type TreeVersion = 1 | 2 | 3;
export const TREE_VERSIONS: TreeVersion[] = [1, 2, 3];

export function treeVersionOf(stored: string | null): TreeVersion {
  return stored === '2' ? 2 : stored === '3' ? 3 : 1;
}

/** How a section stands, in the tree's own terms. */
export type SectionState = 'bare' | 'fading' | 'held';

/** One section as the words beside the tree name it. */
export interface TreeSectionWord {
  id: string;
  title: string;
  /** Its place in the lecture, from 1: the number the Sections list gives it. */
  n: number;
  state: SectionState;
  /** Cards Review would ask now. */
  due: number;
  /** 0..100, how much of what it learned is still held (the Progress page's figure). */
  held: number;
}

export interface TreeCounts {
  sections: TreeSectionWord[];
  /** The fading sections, closest to gone first. */
  fading: TreeSectionWord[];
  /** How many were never answered in: a bare branch. */
  bare: number;
}

/**
 * The tree, counted.
 *
 * Read from `sectionMemory`, what the tree grows its leaves from, so the
 * picture and the words beside it cannot disagree, which is the only reason
 * to put words beside a picture (docs/proposals/design-audit.md §4).
 *
 * A section is fading when it has lost some of what it held, not merely when
 * a card is due. A card missed and not yet got right comes due within hours
 * without ever having been learned: it drops no leaf (lib/sectionMemory
 * heldShare), so calling that section fading would say in words what the
 * owner watched the tree wrongly do hours after a sitting (2026-11-03).
 */
export function treeCounts(course: Course, progress: Record<string, ItemResult>, now: number): TreeCounts {
  const exam = examRule(course, progress, now);
  const sections = sortedSections(course).map((section, i): TreeSectionWord => {
    const m = sectionMemory(section, progress, now, exam);
    const held = Math.round((m.learned ? m.held / m.learned : 1) * 100);
    return {
      id: section.id,
      title: section.title,
      n: i + 1,
      state: m.studied === 0 ? 'bare' : held < 100 ? 'fading' : 'held',
      due: m.due,
      held,
    };
  });
  return {
    sections,
    fading: sections.filter((s) => s.state === 'fading').sort((a, b) => a.held - b.held || b.due - a.due),
    bare: sections.filter((s) => s.state === 'bare').length,
  };
}

/** The line in its parts, so the one saying what is fading can carry the mark it has on the drawing. */
export function treeWordParts(c: TreeCounts): { text: string; fading?: boolean }[] {
  const n = c.sections.length;
  if (n === 0) return [{ text: 'Nothing in this lecture yet' }];
  const sections = { text: `${n} section${n === 1 ? '' : 's'}` };
  const rest = [
    ...(c.fading.length ? [{ text: `${c.fading.length} fading`, fading: true }] : []),
    ...(c.bare ? [{ text: `${c.bare} not started` }] : []),
  ];
  return rest.length ? [sections, ...rest] : [sections, { text: 'nothing fading' }];
}

/** "11 sections · 2 fading · 3 not started": the plain statement that agrees with the drawing. */
export function treeWords(c: TreeCounts): string {
  return treeWordParts(c)
    .map((p) => p.text)
    .join(' · ');
}
