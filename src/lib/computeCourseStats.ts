import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';

export interface StatRow {
  label: string;
  acc: number | null;
  attempts: number;
}

export interface CourseStats {
  studiedCount: number;
  gradableCount: number;
  totalGot: number;
  totalMissed: number;
  accuracyPct: number | null;
  lastSeen: number | null;
  weakestSections: StatRow[];
  weakestTags: StatRow[];
}

/** Ports the vanilla dashboard's accuracy/weak-spot breakdown (mcq + flashcard items only). */
export function computeCourseStats(course: Course, progress: Record<string, ItemResult>): CourseStats {
  const gradable = course.sections.flatMap((section) =>
    section.items
      .filter((item) => item.type === 'mcq' || item.type === 'flashcard')
      .map((item) => ({ item, sectionId: section.id, sectionTitle: section.title })),
  );

  let totalGot = 0;
  let totalMissed = 0;
  let studiedCount = 0;
  let lastSeen: number | null = null;
  const tagStats = new Map<string, { got: number; missed: number }>();
  const sectionStats = new Map<string, { title: string; got: number; missed: number }>();

  for (const { item, sectionId, sectionTitle } of gradable) {
    const r = progress[item.id];
    if (!r || (r.got === 0 && r.missed === 0)) continue;
    studiedCount++;
    totalGot += r.got;
    totalMissed += r.missed;
    if (r.lastSeen && (!lastSeen || r.lastSeen > lastSeen)) lastSeen = r.lastSeen;

    for (const tag of item.tags ?? []) {
      const s = tagStats.get(tag) ?? { got: 0, missed: 0 };
      s.got += r.got;
      s.missed += r.missed;
      tagStats.set(tag, s);
    }

    const sec = sectionStats.get(sectionId) ?? { title: sectionTitle, got: 0, missed: 0 };
    sec.got += r.got;
    sec.missed += r.missed;
    sectionStats.set(sectionId, sec);
  }

  const totalAttempts = totalGot + totalMissed;
  const accuracyPct = totalAttempts > 0 ? Math.round((totalGot / totalAttempts) * 100) : null;
  const accOf = (s: { got: number; missed: number }) =>
    s.got + s.missed > 0 ? Math.round((s.got / (s.got + s.missed)) * 100) : null;

  const rank = (a: StatRow, b: StatRow) => (a.acc ?? 0) - (b.acc ?? 0);

  const weakestTags = [...tagStats.entries()]
    .map(([tag, s]) => ({ label: tag, acc: accOf(s), attempts: s.got + s.missed }))
    .sort(rank)
    .slice(0, 6);

  const weakestSections = [...sectionStats.entries()]
    .map(([, s]) => ({ label: s.title, acc: accOf(s), attempts: s.got + s.missed }))
    .sort(rank)
    .slice(0, 6);

  return {
    studiedCount,
    gradableCount: gradable.length,
    totalGot,
    totalMissed,
    accuracyPct,
    lastSeen,
    weakestSections,
    weakestTags,
  };
}
