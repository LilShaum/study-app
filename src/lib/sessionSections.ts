import type { SessionItem } from './buildSessionItems';

export interface SessionSection {
  id: string;
  title: string;
  count: number;
}

/**
 * The runs of consecutive same-section items in a built session list.
 *
 * Runs rather than a set: a shuffled list interleaves sections, and this
 * returning three entries for two sections is exactly the signal that a
 * "jump to section" control would be meaningless there.
 */
export function sessionSections(items: SessionItem[]): SessionSection[] {
  const out: SessionSection[] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && last.id === item._sectionId) last.count++;
    else out.push({ id: item._sectionId, title: item._sectionTitle, count: 1 });
  }
  return out;
}
