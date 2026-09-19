import type { Course, Section, StudyItem } from '@/schema/course';
import type { ItemResult } from '@/store/progress';

export interface SectionStats {
  id: string;
  title: string;
  total: number;
  /** Items that can be scored — only mcq and flashcard are. */
  gradable: number;
  /** Gradable items with at least one recorded attempt. */
  studied: number;
  got: number;
  missed: number;
  /** 0-100, or null when nothing in this section has been attempted. */
  accuracy: number | null;
  byType: Record<string, number>;
}

const isGradable = (i: StudyItem) => i.type === 'mcq' || i.type === 'flashcard';

/**
 * Per-section progress.
 *
 * Nothing new is stored for this: progress is already keyed per item id, and a
 * section knows its own items, so a section's figures are just its slice of
 * the same map. That is why a section drill-down needs no migration.
 */
export function sectionStats(section: Section, progress: Record<string, ItemResult>): SectionStats {
  const gradable = section.items.filter(isGradable);

  let got = 0;
  let missed = 0;
  let studied = 0;
  for (const item of gradable) {
    const r = progress[item.id];
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
    learn: section.items.length,
    quiz: count('mcq'),
    flashcards: count('flashcard'),
    definitions: count('definition'),
    mixed: section.items.length,
    // Weakest First only ranks what can be scored.
    weakest: section.items.filter(isGradable).length,
  };
}

/** Finds a section by id, or undefined. */
export function findSection(course: Course, sectionId: string): Section | undefined {
  return course.sections.find((s) => s.id === sectionId);
}
