import type { Course } from '@/schema/course';

/**
 * Every slide of the student's material accounted for (docs/proposals/trust.md).
 *
 * The generator's inventory is its own list, so a slide it skipped is missing
 * from the cards and the list alike, and every other check passes. The file's
 * `metadata.source_pages` says how many slides there are and which ones teach
 * nothing (with why); the sections' `source_range`, each item's `source_page`
 * and each figure's `where` say what the rest became. A slide in none of them
 * was skipped without a word: the student should look at it.
 */

export interface SourceCoverage {
  /** How many slides or pages the material has, as the file states. */
  count: number;
  /** "slide" or "page". */
  unit: string;
  /** Slides something in the lecture comes from. */
  taught: number;
  /** Slides the file says teach nothing, with why. */
  notTaught: number;
  /** Slides neither taught nor explained, ascending. */
  missing: number[];
}

/**
 * The slide or page numbers a piece of text names: "slides 12–18", "slide 4",
 * "pp. 4-6", "slides 3, 5 and 9". The unit word must be there, so a figure
 * number or a year is never read as a slide.
 */
export function pagesIn(text: string | undefined): number[] {
  if (!text) return [];
  const out: number[] = [];
  for (const m of text.matchAll(/\b(?:slides?|pages?|pp?\.)\s*((?:\d+(?:\s*(?:[–—-]|to)\s*\d+)?(?:\s*(?:,|and|&)\s*)?)+)/gi)) {
    for (const part of m[1].matchAll(/(\d+)(?:\s*(?:[–—-]|to)\s*(\d+))?/g)) {
      const from = Number(part[1]);
      const to = part[2] ? Number(part[2]) : from;
      if (to >= from && to - from < 500) for (let n = from; n <= to; n++) out.push(n);
    }
  }
  return out;
}

/**
 * Material in parts ("Part 3, slides 4–13"), weeks or several lectures
 * numbers its slides more than once, so a number alone does not name one
 * slide. The check stays out of those rather than guess.
 */
const SEVERAL_NUMBERINGS = /\b(part|week|lecture|chapter|deck|file)\s*\d/i;

/** Null when the file does not account for its slides, or numbers them more than once. */
export function sourceCoverage(course: Course): SourceCoverage | null {
  const src = course.metadata.source_pages;
  if (!src) return null;
  const places: string[] = [];
  for (const s of course.sections) {
    if (s.source_range) places.push(s.source_range);
    for (const i of s.items) {
      if (i.source_page) places.push(i.source_page);
      if (i.type === 'graphic' && i.where) places.push(i.where);
    }
  }
  const skipped = src.not_taught ?? [];
  if ([...places, ...skipped.map((r) => r.range)].some((p) => SEVERAL_NUMBERINGS.test(p))) return null;

  const inRange = (n: number) => n >= 1 && n <= src.count;
  const taught = new Set(places.flatMap(pagesIn).filter(inRange));
  const explained = new Set(skipped.flatMap((r) => pagesIn(r.range)).filter((n) => inRange(n) && !taught.has(n)));
  // Nothing in the file names a slide at all: it cannot be checked, which is
  // not the same as every slide missing.
  if (!taught.size && !explained.size) return null;
  const missing: number[] = [];
  for (let n = 1; n <= src.count; n++) if (!taught.has(n) && !explained.has(n)) missing.push(n);
  const unit = /^page/i.test(src.unit ?? '') ? 'page' : 'slide';
  return { count: src.count, unit, taught: taught.size, notTaught: explained.size, missing };
}

/** "19–21, 30": runs of consecutive numbers joined, for a line a student reads. */
export function runsOf(ns: number[]): string {
  const runs: string[] = [];
  for (let i = 0; i < ns.length; ) {
    let j = i;
    while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++;
    runs.push(j === i ? String(ns[i]) : `${ns[i]}–${ns[j]}`);
    i = j + 1;
  }
  return runs.join(', ');
}
