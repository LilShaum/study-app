import { dayKey, type CourseLog } from '@/store/studyLog';

/** A day counts as studied from one minute. */
const MIN_SECONDS = 60;

export interface DayTotal {
  seconds: number;
  /** Lectures with at least a minute of study that day. */
  lectures: number;
}

export interface HeatCell {
  /** Local date, YYYY-MM-DD. */
  date: string;
  seconds: number;
  lectures: number;
  /** 0 none, 1 to 4 by minutes studied. */
  level: 0 | 1 | 2 | 3 | 4;
  today: boolean;
  future: boolean;
}

/** Seconds and lectures per local date, across every lecture. */
export function sumDays(byCourse: Record<string, Pick<CourseLog, 'days'>>): Record<string, DayTotal> {
  const out: Record<string, DayTotal> = {};
  for (const log of Object.values(byCourse)) {
    for (const [date, seconds] of Object.entries(log.days ?? {})) {
      const d = (out[date] ??= { seconds: 0, lectures: 0 });
      d.seconds += seconds;
      if (seconds >= MIN_SECONDS) d.lectures += 1;
    }
  }
  return out;
}

const levelOf = (seconds: number): HeatCell['level'] => {
  if (seconds < MIN_SECONDS) return 0;
  if (seconds < 10 * 60) return 1;
  if (seconds < 25 * 60) return 2;
  if (seconds < 45 * 60) return 3;
  return 4;
};

const keyOf = (d: Date) => dayKey(d.getTime());
/** Calendar arithmetic on local dates (safe across daylight saving). */
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Week columns, Sunday to Saturday, ending with today's week. */
export function heatmapWeeks(
  days: Record<string, DayTotal>,
  today: Date,
  { minWeeks = 8, maxWeeks = 26 }: { minWeeks?: number; maxWeeks?: number } = {},
): HeatCell[][] {
  const todayKey = keyOf(today);
  const thisWeek = addDays(today, -today.getDay());
  const studied = Object.keys(days)
    .filter((k) => days[k].seconds >= MIN_SECONDS)
    .sort();
  let count = minWeeks;
  if (studied.length) {
    const [y, m, d] = studied[0].split('-').map(Number);
    const first = new Date(y, m - 1, d);
    const firstWeek = addDays(first, -first.getDay());
    // Midnight to midnight can differ by an hour over a clock change; round.
    const span = Math.round((thisWeek.getTime() - firstWeek.getTime()) / (7 * 86400000)) + 1;
    count = span;
  }
  count = Math.max(minWeeks, Math.min(maxWeeks, count));
  const start = addDays(thisWeek, -7 * (count - 1));
  const weeks: HeatCell[][] = [];
  for (let w = 0; w < count; w++) {
    const col: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = keyOf(addDays(start, w * 7 + i));
      const t = days[date];
      const seconds = t?.seconds ?? 0;
      col.push({
        date,
        seconds,
        lectures: t?.lectures ?? 0,
        level: levelOf(seconds),
        today: date === todayKey,
        future: date > todayKey,
      });
    }
    weeks.push(col);
  }
  return weeks;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parts = (date: string) => date.split('-').map(Number) as [number, number, number];

/** A short month name over the first column and over any column holding a 1st. */
export function monthLabels(weeks: HeatCell[][]): (string | null)[] {
  return weeks.map((col, i) => {
    const firstOfMonth = col.find((c) => c.date.endsWith('-01'));
    const cell = firstOfMonth ?? (i === 0 ? col[0] : undefined);
    return cell ? MONTHS[parts(cell.date)[1] - 1].slice(0, 3) : null;
  });
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** "Studied 23 of the last 56 days, 31 minutes on an average day of study." */
export function summaryLine(weeks: HeatCell[][]): string | null {
  const shown = weeks.flat().filter((c) => !c.future);
  // Counted from the first day studied: a student who began three days ago
  // has studied 2 of the last 3 days, not 2 of the last 52 the grid shows.
  const first = shown.findIndex((c) => c.level >= 1);
  if (first < 0) return null;
  const since = shown.slice(first);
  const studied = since.filter((c) => c.level >= 1);
  const avg = Math.round(studied.reduce((s, c) => s + c.seconds, 0) / studied.length / 60);
  if (since.length === 1) return `Studied today: ${plural(avg, 'minute')}.`;
  return `Studied ${studied.length} of the last ${plural(since.length, 'day')}, ${plural(avg, 'minute')} on an average day of study.`;
}

/** "Tuesday 4 November: 35 minutes, 3 lectures." */
export function dayLine(cell: HeatCell): string {
  const [y, m, d] = parts(cell.date);
  const name = `${DAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1]}`;
  if (cell.level === 0) return `${name}: no study.`;
  return `${name}: ${plural(Math.round(cell.seconds / 60), 'minute')}, ${plural(cell.lectures, 'lecture')}.`;
}
