/**
 * Says where a Learn or Today card is within its part of the sitting, for the session's header.
 */
import type { Course } from '@/schema/course';
import type { SessionItem } from '@/lib/buildSessionItems';
import { sortedSections } from './sortedSections';

/**
 * Where a Learn or Today card is within its part: the run of review cards
 * at a sitting's start, or the run of one section's cards.
 */
export function partCount(items: SessionItem[], index: number, course: Course): string {
  const here = items[index];
  if (!here) return '';
  const key = (i: SessionItem | undefined) => (i ? (i._block === 'review' ? 'review' : `s:${i._sectionId}`) : null);
  const k = key(here);
  let start = index;
  while (start > 0 && key(items[start - 1]) === k) start--;
  let end = index;
  while (end < items.length - 1 && key(items[end + 1]) === k) end++;
  const at = `${index - start + 1} of ${end - start + 1}`;
  if (k === 'review') return `Review · ${at}`;
  const n = sortedSections(course).findIndex((s) => s.id === here._sectionId);
  return n >= 0 ? `Section ${n + 1} · ${at}` : at;
}

