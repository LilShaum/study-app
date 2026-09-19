import type { Course, Section, StudyItem } from '@/schema/course';
import { allItems, duplicateKey, itemPrompt, type Fragment } from '@/schema/fragment';
import { generateId } from './generateId';

export interface MergePlanSection {
  id: string;
  title: string;
  /** True when this section doesn't exist in the course yet. */
  isNew: boolean;
  added: StudyItem[];
  /** Incoming items skipped because the course already has the same prompt. */
  duplicates: { item: StudyItem; existingPrompt: string }[];
}

/** One existing item the paste would replace, kept under its own id. */
export interface MergePlanCorrection {
  id: string;
  sectionId: string;
  before: StudyItem;
  after: StudyItem;
  /** Top-level fields whose value actually differs, for the preview. */
  changed: string[];
}

export interface MergePlan {
  sections: MergePlanSection[];
  /** Fixes to existing items, applied in place under the same id. */
  corrections: MergePlanCorrection[];
  /** Correction ids this course doesn't have — reported, never applied. */
  unmatchedCorrections: string[];
  totalCorrected: number;
  /** Incoming id → the id it was given because the original was taken. */
  renamedIds: Record<string, string>;
  totalAdded: number;
  totalDuplicates: number;
  /** Per-type counts of what would actually be added. */
  countsByType: Record<string, number>;
}

export interface MergeOptions {
  /** When false, items whose prompt already exists are added anyway. */
  skipDuplicates?: boolean;
}

/** Top-level fields that differ between the current item and its replacement. */
function changedFields(before: StudyItem, after: StudyItem): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  keys.delete('id');
  const b = before as unknown as Record<string, unknown>;
  const a = after as unknown as Record<string, unknown>;
  return [...keys].filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
}

/**
 * Corrections to existing items, matched by id.
 *
 * Matching by id and keeping it is the whole point: progress is stored per
 * item id, so a question whose answer key gets fixed keeps the history the
 * student built on it. Replacing the course file wholesale — the obvious
 * alternative when a generator hands back "the fixed version" — would give
 * every item a new id and silently zero every score.
 *
 * An id the course doesn't have is reported rather than added. A model that
 * invents one is more likely to be hallucinating than offering new content,
 * and quietly adding it would be the one outcome nobody asked for.
 */
function planCorrections(course: Course, fragment: Fragment) {
  const located = new Map<string, { item: StudyItem; sectionId: string }>();
  for (const section of course.sections) {
    for (const item of section.items) located.set(item.id, { item, sectionId: section.id });
  }

  const corrections: MergePlanCorrection[] = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();

  for (const after of fragment.corrections ?? []) {
    const found = located.get(after.id);
    if (!found) {
      unmatched.push(after.id);
      continue;
    }
    // A paste that corrects the same item twice keeps the first; applying
    // both would make the preview a lie about the end state.
    if (seen.has(after.id)) continue;
    seen.add(after.id);

    const changed = changedFields(found.item, after);
    // A "correction" identical to what is already there is not a change.
    if (changed.length === 0) continue;

    corrections.push({ id: after.id, sectionId: found.sectionId, before: found.item, after, changed });
  }

  return { corrections, unmatched };
}

/**
 * Works out exactly what merging `fragment` into `course` would do, without
 * touching the course.
 *
 * Split from the apply step on purpose: the preview the student confirms and
 * the mutation that follows are computed by the same call, so the dialog can
 * never promise "12 items into 2 sections" and then do something else.
 *
 * Two things it resolves rather than reporting as errors:
 *
 * - **Id collisions.** Progress is keyed per item id, so an incoming item
 *   reusing an existing id would silently share that item's score. Colliding
 *   ids are reassigned (and reported, so the change isn't invisible).
 * - **Duplicates.** Regenerating from the same notes tends to re-emit items
 *   you already have. Matching an existing item's prompt is skipped by
 *   default — near-certainly a re-run, and a duplicate is worse than a
 *   missing item because it double-counts in the score.
 *
 * A fragment may also carry `corrections`: replacements for existing items,
 * matched and kept under their own ids. See `planCorrections`.
 */
export function planMerge(course: Course, fragment: Fragment, options: MergeOptions = {}): MergePlan {
  const skipDuplicates = options.skipDuplicates ?? true;

  const takenIds = new Set(allItems(course.sections).map((i) => i.id));
  const existingPrompts = new Map<string, string>();
  for (const item of allItems(course.sections)) {
    existingPrompts.set(duplicateKey(item), itemPrompt(item));
  }

  const renamedIds: Record<string, string> = {};
  const countsByType: Record<string, number> = {};
  const sections: MergePlanSection[] = [];

  const { corrections, unmatched } = planCorrections(course, fragment);
  // An item being corrected keeps its id, so that id is not free for an
  // addition to take.
  for (const c of corrections) takenIds.add(c.id);

  for (const incoming of fragment.sections ?? []) {
    const existing = course.sections.find((s) => s.id === incoming.id);
    const added: StudyItem[] = [];
    const duplicates: MergePlanSection['duplicates'] = [];

    for (const item of incoming.items) {
      const key = duplicateKey(item);
      const clash = existingPrompts.get(key);
      if (clash !== undefined && skipDuplicates) {
        duplicates.push({ item, existingPrompt: clash });
        continue;
      }

      let finalItem = item;
      if (takenIds.has(item.id)) {
        let replacement = generateId(item.type);
        while (takenIds.has(replacement)) replacement = generateId(item.type);
        renamedIds[item.id] = replacement;
        finalItem = { ...item, id: replacement } as StudyItem;
      }

      takenIds.add(finalItem.id);
      // Register the prompt so a fragment that repeats itself internally
      // doesn't slip two copies past a check that only saw the course.
      existingPrompts.set(key, itemPrompt(finalItem));
      countsByType[finalItem.type] = (countsByType[finalItem.type] ?? 0) + 1;
      added.push(finalItem);
    }

    if (added.length === 0 && duplicates.length === 0) continue;

    sections.push({
      id: incoming.id,
      title: existing?.title ?? incoming.title ?? incoming.id,
      isNew: !existing,
      added,
      duplicates,
    });
  }

  return {
    sections,
    corrections,
    unmatchedCorrections: unmatched,
    totalCorrected: corrections.length,
    renamedIds,
    totalAdded: sections.reduce((n, s) => n + s.added.length, 0),
    totalDuplicates: sections.reduce((n, s) => n + s.duplicates.length, 0),
    countsByType,
  };
}

/**
 * Applies a plan, returning a new Course. Pure — the caller stores the result.
 *
 * `metadata.total_items` and `item_counts` are refreshed when the course
 * already carried them, since a stale count is worse than an absent one (the
 * course overview trusts `item_counts` over recounting).
 */
export function applyMerge(course: Course, plan: MergePlan): Course {
  const byId = new Map(plan.sections.map((s) => [s.id, s]));
  const corrected = new Map(plan.corrections.map((c) => [c.id, c.after]));

  const sections: Section[] = course.sections.map((section) => {
    const planned = byId.get(section.id);
    // Corrections replace in place, keeping the item's id AND its position:
    // the id so its progress survives, the position so a Learn run doesn't
    // silently reshuffle because a question was fixed.
    const items = corrected.size
      ? section.items.map((item) => corrected.get(item.id) ?? item)
      : section.items;
    if (!planned || planned.added.length === 0) {
      return items === section.items ? section : { ...section, items };
    }
    return { ...section, items: [...items, ...planned.added] };
  });

  for (const planned of plan.sections) {
    if (!planned.isNew || planned.added.length === 0) continue;
    sections.push({
      id: planned.id,
      title: planned.title,
      order: sections.length,
      items: planned.added,
    });
  }

  const merged: Course = { ...course, sections };

  const hasTotal = course.metadata.total_items !== undefined;
  const hasCounts = course.metadata.item_counts !== undefined;
  if (hasTotal || hasCounts) {
    const items = allItems(sections);
    merged.metadata = { ...course.metadata };
    if (hasTotal) merged.metadata.total_items = items.length;
    if (hasCounts) {
      const counts: Record<string, number> = {};
      for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
      merged.metadata.item_counts = counts;
    }
  }

  return merged;
}
