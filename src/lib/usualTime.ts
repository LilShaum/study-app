import type { CourseLog } from '@/store/studyLog';

const DAY = 86_400_000;
/** Days of study needed before a habit is worth suggesting. */
const ENOUGH_DAYS = 4;

/**
 * When the student usually starts studying, as "HH:MM", for the daily
 * reminder (the owner, 2026-11-25: "why not help the user choose?"). Each
 * day of the last 30 counts once, by its first answer; the middle of those
 * start times, to the quarter hour. Null until there are enough days.
 */
export function usualStartTime(byCourse: Record<string, CourseLog>, now: number): string | null {
  const firstByDay = new Map<string, number>();
  for (const log of Object.values(byCourse)) {
    for (const a of log.answers ?? []) {
      if (a.at > now || now - a.at > 30 * DAY) continue;
      const d = new Date(a.at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const minutes = d.getHours() * 60 + d.getMinutes();
      const seen = firstByDay.get(key);
      if (seen == null || minutes < seen) firstByDay.set(key, minutes);
    }
  }
  if (firstByDay.size < ENOUGH_DAYS) return null;
  const starts = [...firstByDay.values()].sort((a, b) => a - b);
  const mid = starts[Math.floor(starts.length / 2)]!;
  const q = Math.round(mid / 15) * 15 % (24 * 60);
  return `${String(Math.floor(q / 60)).padStart(2, '0')}:${String(q % 60).padStart(2, '0')}`;
}

/** "21:15" as a student reads it: "9:15 pm"; "12:00" as "noon". */
export function timeLabel(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  if (h === 12 && m === 0) return 'noon';
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}
