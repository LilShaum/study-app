import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import type { ExamRule } from './exam';
import { nextDueAt } from './memory';
import { scoredEntries } from './scored';

export interface Forecast {
  label: string;
  count: number;
}

const DAY_MS = 86_400_000;
const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * How many studied cards come due, and when: now, later today, tomorrow,
 * within the week, after that. Calendar days, as whenLabel counts them.
 * Cards never answered are not here: they are not fading, they are new.
 */
export function forecastDue(course: Course, progress: Record<string, ItemResult>, now: number, exam?: ExamRule): Forecast[] {
  const counts = [0, 0, 0, 0, 0];
  const today = startOfDay(now);
  for (const section of course.sections) {
    const examAt = exam?.forSection(section.id) ?? null;
    for (const { id } of scoredEntries(section.items)) {
      const at = nextDueAt(progress[id], now, examAt);
      if (at == null) continue;
      const days = Math.round((startOfDay(at) - today) / DAY_MS);
      counts[at <= now ? 0 : days <= 0 ? 1 : days === 1 ? 2 : days < 7 ? 3 : 4]! += 1;
    }
  }
  return ['Due now', 'Later today', 'Tomorrow', 'Within the week', 'After that'].map((label, i) => ({ label, count: counts[i]! }));
}
