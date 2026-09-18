import { z } from 'zod';
import { CourseSchema, StudyItemSchema, type Section, type StudyItem } from './course';
import { formatZodError } from './formatZodError';

/* ============================================================
   COURSE FRAGMENT — the shape accepted when ADDING to an
   existing course, as opposed to importing a whole new one.
   ============================================================ */

/**
 * A section in a fragment. `title` is optional because the common case is
 * appending to a section that already exists — you only need its `id`. A
 * brand-new section needs a title, which `mergeFragment` enforces (it falls
 * back to the id rather than rejecting, so a generator that forgets one
 * doesn't cost the student the whole paste).
 */
export const FragmentSectionSchema = z.looseObject({
  id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  items: z.array(StudyItemSchema),
});

export const FragmentSchema = z.looseObject({
  sections: z.array(FragmentSectionSchema).min(1),
});

export type FragmentSection = z.infer<typeof FragmentSectionSchema>;
export type Fragment = z.infer<typeof FragmentSchema>;

export type ParseFragmentResult = { ok: true; fragment: Fragment } | { ok: false; error: string };

/**
 * Parses pasted JSON as something to merge into an existing course.
 *
 * Deliberately permissive about the wrapper, because a generator asked for
 * "more items for this course" reasonably returns any of these:
 *
 *   1. `{ "sections": [ { "id": "...", "items": [...] } ] }`  — the fragment
 *   2. a full `.study.json` course                            — use its sections
 *   3. `{ "items": [...] }` or a bare `[ ...items ]`          — loose items
 *
 * Only the item objects themselves are held to the real schema. Being strict
 * about the envelope would just mean rejecting good content over packaging.
 */
export function parseFragment(raw: unknown, fallbackSectionId: string): ParseFragmentResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Expected a JSON object or array of items.' };
  }

  // (3) A bare array, or { items: [...] } — wrap it into one section.
  const looseItems = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>).items)
      ? ((raw as Record<string, unknown>).items as unknown[])
      : null;

  if (looseItems) {
    const parsed = z.array(StudyItemSchema).min(1).safeParse(looseItems);
    if (!parsed.success) {
      return { ok: false, error: `Those items aren't valid:\n${formatZodError(parsed.error)}` };
    }
    return { ok: true, fragment: { sections: [{ id: fallbackSectionId, items: parsed.data }] } };
  }

  // (2) A full course file — a whole-course generation pasted in by mistake,
  // or on purpose to fold one course into another. Take its sections.
  const asCourse = CourseSchema.safeParse(raw);
  if (asCourse.success) {
    return { ok: true, fragment: { sections: asCourse.data.sections } };
  }

  // (1) The fragment shape.
  const asFragment = FragmentSchema.safeParse(raw);
  if (asFragment.success) {
    return { ok: true, fragment: asFragment.data };
  }

  return {
    ok: false,
    error: `This doesn't look like course content:\n${formatZodError(asFragment.error)}`,
  };
}

/** The text an item leads with — what a reader would call "the same question". */
export function itemPrompt(item: StudyItem): string {
  switch (item.type) {
    case 'mcq':
      return item.question;
    case 'flashcard':
      return item.front;
    case 'definition':
      return item.term;
    default:
      return item.title;
  }
}

/** Loose key for duplicate detection: case/punctuation/whitespace-insensitive. */
export function duplicateKey(item: StudyItem): string {
  return `${item.type}:${itemPrompt(item)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()}`;
}

/** Every item in a course, flattened. */
export function allItems(sections: readonly Section[]): StudyItem[] {
  return sections.flatMap((s) => s.items);
}
