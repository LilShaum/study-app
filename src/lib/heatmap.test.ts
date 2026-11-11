import { describe, expect, it } from 'vitest';
import {
  dayLine,
  heatmapWeeks,
  monthLabels,
  studyStats,
  summaryLine,
  sumDays,
  timeByClass,
  timeStudied,
  type DayTotal,
} from './heatmap';

// Tuesday 4 November 2025, noon.
const TODAY = new Date(2025, 10, 4, 12);
const min = (m: number): DayTotal => ({ seconds: m * 60, lectures: 1 });

describe('sumDays', () => {
  it('adds seconds across lectures and counts lectures with a minute', () => {
    const out = sumDays({
      a: { days: { '2025-11-04': 600, '2025-11-03': 30 } },
      b: { days: { '2025-11-04': 59 } },
      c: { days: { '2025-11-04': 60 } },
    });
    expect(out['2025-11-04']).toEqual({ seconds: 719, lectures: 2 });
    expect(out['2025-11-03']).toEqual({ seconds: 30, lectures: 0 });
  });
});

describe('heatmapWeeks', () => {
  it('has Sunday-first columns of seven, ending with today’s week', () => {
    const weeks = heatmapWeeks({ '2025-09-03': min(5) }, TODAY);
    for (const w of weeks) expect(w).toHaveLength(7);
    expect(weeks[0][0].date).toBe('2025-08-31'); // Sunday of the first study day's week
    const last = weeks[weeks.length - 1];
    expect(last[0].date).toBe('2025-11-02');
    expect(last[2].date).toBe('2025-11-04');
  });

  it('starts at the first study week when between the limits', () => {
    expect(heatmapWeeks({ '2025-10-01': min(5) }, TODAY, { minWeeks: 2 })).toHaveLength(6);
    expect(heatmapWeeks({ '2025-09-01': min(5) }, TODAY)).toHaveLength(10);
  });

  it('clamps to 26 columns for an old first day and 8 for a recent one', () => {
    const old = new Date(2025, 10, 4 - 280);
    const k = `${old.getFullYear()}-${String(old.getMonth() + 1).padStart(2, '0')}-${String(old.getDate()).padStart(2, '0')}`;
    expect(heatmapWeeks({ [k]: min(5) }, TODAY)).toHaveLength(26);
    expect(heatmapWeeks({ '2025-11-03': min(5) }, TODAY)).toHaveLength(8);
    expect(heatmapWeeks({}, TODAY)).toHaveLength(8);
  });

  it('honours custom limits', () => {
    expect(heatmapWeeks({ '2025-11-03': min(5) }, TODAY, { minWeeks: 3 })).toHaveLength(3);
  });

  it('marks levels at their boundaries', () => {
    const cases: [number, number][] = [
      [0, 0], [59, 0], [60, 1], [599, 1], [600, 2], [1499, 2], [1500, 3], [2699, 3], [2700, 4], [9000, 4],
    ];
    for (const [seconds, level] of cases) {
      const w = heatmapWeeks({ '2025-11-04': { seconds, lectures: 1 } }, TODAY);
      const cell = w[w.length - 1][2];
      expect(cell.level, `${seconds}s`).toBe(level);
    }
  });

  it('flags today and future days', () => {
    const weeks = heatmapWeeks({}, TODAY);
    const last = weeks[weeks.length - 1];
    expect(last.map((c) => c.today)).toEqual([false, false, true, false, false, false, false]);
    expect(last.map((c) => c.future)).toEqual([false, false, false, true, true, true, true]);
    expect(weeks.slice(0, -1).flat().some((c) => c.future || c.today)).toBe(false);
  });
});

describe('monthLabels', () => {
  it('labels the first column and the column holding a 1st', () => {
    const weeks = heatmapWeeks({ '2025-09-01': min(5) }, TODAY);
    const labels = monthLabels(weeks);
    expect(labels[0]).toBe('Sep'); // the first column holds Monday 1 September
    const early = monthLabels(heatmapWeeks({ '2025-09-10': min(5) }, TODAY));
    expect(early[0]).toBe('Sep'); // first column, no 1st in it
    const at = (d: string) => weeks.findIndex((w) => w.some((c) => c.date === d));
    expect(labels[at('2025-09-01')]).toBe('Sep');
    expect(labels[at('2025-10-01')]).toBe('Oct');
    expect(labels[at('2025-11-01')]).toBe('Nov');
    expect(labels.filter(Boolean)).toHaveLength(3);
  });
});

describe('summaryLine', () => {
  it('is null when nothing was studied', () => {
    expect(summaryLine(heatmapWeeks({}, TODAY))).toBeNull();
    expect(summaryLine(heatmapWeeks({ '2025-11-04': { seconds: 59, lectures: 0 } }, TODAY))).toBeNull();
  });

  it('uses the plural', () => {
    const weeks = heatmapWeeks({ '2025-11-03': min(20), '2025-11-04': min(42) }, TODAY);
    expect(summaryLine(weeks)).toBe('Studied 2 of the last 2 days, 31 minutes on an average day of study.');
  });

  // The grid shows at least 8 weeks, but a student who began three days ago
  // has studied 2 of the last 3 days, not 2 of the last 52.
  it('counts from the first day studied, not from the start of the grid', () => {
    const weeks = heatmapWeeks({ '2025-11-02': min(5), '2025-11-04': min(5) }, TODAY);
    expect(weeks).toHaveLength(8);
    expect(summaryLine(weeks)).toBe('Studied 2 of the last 3 days, 5 minutes on an average day of study.');
  });

  it('uses the singular', () => {
    const one = heatmapWeeks({ '2025-11-02': min(1) }, TODAY, { minWeeks: 1 });
    expect(summaryLine(one)).toBe('Studied 1 of the last 3 days, 1 minute on an average day of study.');
  });

  it('says a first day of study plainly', () => {
    const weeks = heatmapWeeks({ '2025-11-04': min(12) }, TODAY);
    expect(summaryLine(weeks)).toBe('Studied today: 12 minutes.');
  });
});

describe('dayLine', () => {
  const cell = (seconds: number, lectures: number) => {
    const w = heatmapWeeks({ '2025-11-04': { seconds, lectures } }, TODAY);
    return w[w.length - 1][2];
  };
  it('names the day, minutes and lectures', () => {
    expect(dayLine(cell(35 * 60, 3))).toBe('Tuesday 4 November: 35 minutes, 3 lectures.');
  });
  it('uses singulars', () => {
    expect(dayLine(cell(60, 1))).toBe('Tuesday 4 November: 1 minute, 1 lecture.');
  });
  it('says no study for an empty day', () => {
    expect(dayLine(cell(0, 0))).toBe('Tuesday 4 November: no study.');
  });
});

describe('studyStats', () => {
  // TODAY is Tuesday 4 November 2025.
  const days = {
    '2025-10-20': min(30), '2025-10-21': min(30), '2025-10-22': min(30), '2025-10-23': min(30), // 4 in a row
    '2025-11-01': min(20), '2025-11-02': min(20), '2025-11-03': min(20), // up to yesterday
    '2025-10-25': { seconds: 30, lectures: 0 }, // under a minute: not a day of study
  };

  it('counts days, time, and the longest run', () => {
    const s = studyStats(days, TODAY);
    expect(s.days).toBe(7);
    expect(s.longest).toBe(4);
    expect(s.seconds).toBe((4 * 30 + 3 * 20) * 60 + 30);
  });

  it('counts the current streak from yesterday until today is studied', () => {
    expect(studyStats(days, TODAY).current).toBe(3);
    expect(studyStats({ ...days, '2025-11-04': min(5) }, TODAY).current).toBe(4);
    expect(studyStats({ '2025-11-01': min(5) }, TODAY).current).toBe(0);
  });

  it('says the time in words', () => {
    expect(timeStudied(45 * 60)).toBe('45 minutes');
    expect(timeStudied(4.5 * 3600)).toBe('4.5 hours');
    expect(timeStudied(24 * 3600)).toBe('24 hours');
    expect(timeStudied(3600)).toBe('1 hour');
  });
});

describe('timeByClass', () => {
  const lecture = (course_code?: string) => ({ metadata: { course_code } });
  const log = (...seconds: number[]) => ({ days: Object.fromEntries(seconds.map((x, i) => [`2025-10-${String(i + 1).padStart(2, '0')}`, x])) });

  it('totals each class code, most first, then Other, then removed lectures', () => {
    const rows = timeByClass(
      {
        a: log(600, 1200), // BIOL 1800
        b: log(3000), // CHEM 3000
        c: log(900), // BIOL again: 2700 in all
        d: log(400), // no code
        e: { ...log(700), removed: true },
        f: log(300), // its lecture is gone, though not marked removed
      },
      { a: lecture('BIOL'), b: lecture('CHEM'), c: lecture(' BIOL '), d: lecture() },
    );
    expect(rows).toEqual([
      { label: 'CHEM', seconds: 3000, kind: 'class' },
      { label: 'BIOL', seconds: 2700, kind: 'class' },
      { label: 'Other', seconds: 400, kind: 'other' },
      { label: 'Removed lectures', seconds: 1000, kind: 'removed' },
    ]);
  });

  it('counts a removed log under its lecture when the lecture is back in the library', () => {
    const rows = timeByClass({ a: { days: { '2025-10-01': 600 }, removed: true } }, { a: lecture('BIOL') });
    expect(rows).toEqual([{ label: 'BIOL', seconds: 600, kind: 'class' }]);
  });

  it('leaves out a row under a minute, and an empty code is no code', () => {
    expect(timeByClass({ a: log(30), b: log(120) }, { a: lecture('BIOL'), b: lecture('  ') })).toEqual([
      { label: 'Other', seconds: 120, kind: 'other' },
    ]);
    expect(timeByClass({}, {})).toEqual([]);
  });

  it('breaks a tie by name, so the order does not change between visits', () => {
    const rows = timeByClass({ a: log(600), b: log(600) }, { a: lecture('PHYS'), b: lecture('ANAT') });
    expect(rows.map((r) => r.label)).toEqual(['ANAT', 'PHYS']);
  });
});
