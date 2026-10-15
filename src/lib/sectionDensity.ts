import type { Course } from '@/schema/course';

/**
 * How many items each section has for the slides it comes from.
 *
 * Item counts should follow what a lecture teaches, not how long it is, and
 * a lecture's sections differ for good reasons. But the outliers are worth a
 * look: one slide of basics carrying twenty cards (an older prompt wrote a
 * definition for every term it met), or ten slides of a core pathway
 * carrying eight (a prompt that read figure labels as decoration). Both were
 * found on the owner's real lectures (docs/HANDOFF.md, 2026-10-14). The app
 * cannot judge importance, so it only points: the student, with the slides,
 * decides.
 */

export interface SectionDensity {
  id: string;
  title: string;
  slides: number;
  items: number;
  perSlide: number;
}

export interface DensityReport {
  /** Items per slide across the lecture's sections (the median). */
  typical: number;
  /** Many items for few slides. */
  dense: SectionDensity[];
  /** Few items for many slides. */
  sparse: SectionDensity[];
}

/**
 * Slides (or pages) in a section's source_range: "slides 12–18" is 7,
 * "Part 3 slides 4–13, 21" is 11, "Part 1, slide 17" is 1. Null when it
 * names none ("Chapter 4"), so the section is left out rather than guessed.
 */
export function slidesIn(range: string | undefined): number | null {
  if (!range) return null;
  let total = 0;
  let found = false;
  for (const m of range.matchAll(/(?:slides?|pages?|pp?\.)\s*((?:\d+(?:\s*[–—-]\s*\d+)?(?:\s*(?:,|and|&)\s*)?)+)/gi)) {
    for (const part of m[1].matchAll(/(\d+)(?:\s*[–—-]\s*(\d+))?/g)) {
      const from = Number(part[1]);
      const to = part[2] ? Number(part[2]) : from;
      if (to >= from && to - from < 500) {
        total += to - from + 1;
        found = true;
      }
    }
  }
  return found ? total : null;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Too few sections with ranges to say what is typical: no report. */
export const MIN_SECTIONS = 4;

export function sectionDensity(course: Course): DensityReport | null {
  const rows: SectionDensity[] = [];
  for (const s of course.sections) {
    const slides = slidesIn(s.source_range);
    if (!slides) continue;
    const items = s.items.filter((i) => !i.set_aside).length;
    rows.push({ id: s.id, title: s.title, slides, items, perSlide: items / slides });
  }
  if (rows.length < MIN_SECTIONS) return null;
  const typical = median(rows.map((r) => r.perSlide));
  return {
    typical,
    // Twice the typical rate is a lecture's ordinary spread; this is a
    // section well past it, with enough items to matter.
    dense: rows.filter((r) => r.perSlide >= Math.max(2.5 * typical, 6) && r.items >= 8),
    sparse: rows.filter((r) => r.slides >= 3 && r.perSlide <= typical / 2),
  };
}
