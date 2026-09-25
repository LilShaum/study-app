import type { Course, Section } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { scoredEntries } from './scored';

export interface SectionStats {
  id: string;
  title: string;
  total: number;
  /** Things that can be scored: each mcq and flashcard, and each definition's typed recall. */
  gradable: number;
  /** Gradable items with at least one recorded attempt. */
  studied: number;
  got: number;
  missed: number;
  /** 0-100, or null when nothing in this section has been attempted. */
  accuracy: number | null;
  byType: Record<string, number>;
}

/**
 * Per-section progress.
 *
 * Nothing new is stored for this: progress is already keyed per item id, and a
 * section knows its own items, so a section's figures are just its slice of
 * the same map. That is why a section drill-down needs no migration.
 */
export function sectionStats(section: Section, progress: Record<string, ItemResult>): SectionStats {
  const gradable = scoredEntries(section.items);

  let got = 0;
  let missed = 0;
  let studied = 0;
  for (const { id } of gradable) {
    const r = progress[id];
    if (!r || (r.got === 0 && r.missed === 0)) continue;
    studied++;
    got += r.got;
    missed += r.missed;
  }

  const attempts = got + missed;
  const byType: Record<string, number> = {};
  for (const item of section.items) byType[item.type] = (byType[item.type] ?? 0) + 1;

  return {
    id: section.id,
    title: section.title,
    total: section.items.length,
    gradable: gradable.length,
    studied,
    got,
    missed,
    accuracy: attempts > 0 ? Math.round((got / attempts) * 100) : null,
    byType,
  };
}

/** Which study modes have anything to serve in this section. */
export function availableModes(section: Section): {
  learn: number;
  quiz: number;
  flashcards: number;
  definitions: number;
  mixed: number;
  weakest: number;
} {
  const count = (type: string) => section.items.filter((i) => i.type === type).length;
  return {
    // Learn reads each definition and later asks for it, so it serves both.
    learn: section.items.length + count('definition'),
    quiz: count('mcq'),
    flashcards: count('flashcard'),
    definitions: count('definition'),
    mixed: section.items.length,
    // Weakest First only ranks what can be scored.
    weakest: scoredEntries(section.items).length,
  };
}

/** Finds a section by id, or undefined. */
export function findSection(course: Course, sectionId: string): Section | undefined {
  return course.sections.find((s) => s.id === sectionId);
}
