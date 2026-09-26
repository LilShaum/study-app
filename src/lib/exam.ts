import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { examTime } from './memory';
import { scoredEntries } from './scored';

/**
 * When the exam date starts to steer Review, and for which items.
 *
 * The date used to apply to everything studied, from the moment it was set.
 * Simulated over a month of lectures (sim/FINDINGS.md, 2026-09-26), that
 * cost 4–7 points on the exam and never helped: Review kept the early
 * sections polished for the day while later sections, also on the exam,
 * were never opened. So the date now applies only to items the exam covers,
 * and holds back while any of those have never been studied — learning them
 * is worth more than polishing the rest — until the last week, when what
 * you have is what you protect.
 */
export const PROTECT_FROM_DAYS = 7;

const DAY_MS = 86_400_000;

export interface ExamRule {
  /** When the exam is, or null with no date or once it has passed. */
  at: number | null;
  /** The sections it covers, or null for all of them. */
  scope: ReadonlySet<string> | null;
  /** Scored items the exam covers that have never been answered. */
  unseen: number;
  /** Whether the exam is steering Review right now. */
  protecting: boolean;
  /** The exam time to judge this item by — null when the exam does not apply to it now. */
  forItem: (itemId: string) => number | null;
  /** The same for a whole section. */
  forSection: (sectionId: string) => number | null;
  /**
   * The exam time if the exam covers this item, whether or not it is steering
   * Review yet: for saying when something comes back, since holding back
   * ends in the last week anyway.
   */
  covering: (itemId: string) => number | null;
}

const sectionOfItem = new WeakMap<Course, Map<string, string>>();

function itemSections(course: Course): Map<string, string> {
  let map = sectionOfItem.get(course);
  if (!map) {
    map = new Map();
    for (const section of course.sections) {
      for (const { id } of scoredEntries(section.items)) map.set(id, section.id);
    }
    sectionOfItem.set(course, map);
  }
  return map;
}

export function examRule(course: Course, progress: Record<string, ItemResult>, now: number): ExamRule {
  const date = examTime(course.metadata.exam_date);
  const at = date != null && date > now ? date : null;
  const listed = course.metadata.exam_sections?.filter((id) => course.sections.some((s) => s.id === id));
  const scope = listed?.length ? new Set(listed) : null;
  const inScope = (sectionId: string | undefined) => !scope || (sectionId != null && scope.has(sectionId));

  let unseen = 0;
  if (at != null) {
    for (const section of course.sections) {
      if (!inScope(section.id)) continue;
      for (const { id } of scoredEntries(section.items)) {
        const r = progress[id];
        if (!r || r.got + r.missed === 0) unseen++;
      }
    }
  }
  const protecting = at != null && (unseen === 0 || now >= at - PROTECT_FROM_DAYS * DAY_MS);
  const sections = itemSections(course);

  return {
    at,
    scope,
    unseen,
    protecting,
    forItem: (itemId) => (protecting && inScope(sections.get(itemId)) ? at : null),
    forSection: (sectionId) => (protecting && inScope(sectionId) ? at : null),
    covering: (itemId) => (at != null && inScope(sections.get(itemId)) ? at : null),
  };
}
