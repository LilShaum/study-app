import type { Course } from '@/schema/course';
import { allItems } from '@/schema/fragment';

/**
 * A prefix no item id in the course starts with ("add1_", "add2_", …), for a
 * prompt to give the model: one rule it can follow, where a list of taken ids
 * would be too long to show whole. planMerge still renames any collision.
 */
export function freshIdPrefix(course: Course, stem = 'add'): string {
  const ids = allItems(course.sections).map((i) => i.id);
  let k = 1;
  while (ids.some((id) => id.startsWith(`${stem}${k}_`))) k++;
  return `${stem}${k}_`;
}
