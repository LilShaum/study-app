import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { simulate, type Scenario } from './engine';

/**
 * Several courses, one daily budget: how should the minutes be split?
 *
 *   npx vitest run --config vitest.sim.config.ts sim/several.sim.ts
 *
 * A student with three courses and three exams has one amount of time a
 * day, not one per course. Courses share no cards, so as long as the split
 * depends only on the calendar (the exam dates), each course can be run on
 * its own with its share of each day's minutes, and the result is the same
 * as running them together. A split that reacts to what is due would need
 * the courses run side by side; none of these does.
 *
 * Results go to sim/results/several.md (not committed).
 */
const COURSES = [
  { name: 'A', exam: 12 },
  { name: 'B', exam: 21 },
  { name: 'C', exam: 31 },
];

type Split = (day: number) => Record<string, number>;
const weights =
  (w: (daysLeft: number) => number): ((budget: number) => Split) =>
  (budget) =>
  (day) => {
    const live = COURSES.filter((c) => c.exam > day);
    const ws = live.map((c) => w(c.exam - day));
    const total = ws.reduce((a, b) => a + b, 0) || 1;
    return Object.fromEntries(live.map((c, i) => [c.name, (budget * ws[i]) / total]));
  };

const SPLITS: Record<string, (budget: number) => Split> = {
  /** The same share for every course with its exam still ahead. */
  equal: weights(() => 1),
  /** Share by how soon the exam is: 1 / days left. */
  nearest: weights((left) => 1 / left),
  /** Equal, but a course in its last week gets three shares. */
  'exam-week': weights((left) => (left <= 7 ? 3 : 1)),
  /** Equal, but a course in its last week gets everything it can (ten shares). */
  'exam-week-strong': weights((left) => (left <= 7 ? 10 : 1)),
};

it('several courses', () => {
  Storage.prototype.setItem = () => {};
  const seeds = Number(process.env.SIM_SEEDS ?? 3);
  const lines: string[] = ['| Budget | Memory | Split | A (day 12) | B (day 21) | C (day 31) | Mean |', '|---|---|---|---|---|---|---|'];
  const realNow = Date.now;
  try {
    for (const budget of [45, 60, 90]) {
      for (const memory of ['fsrs', 'harsh']) {
        for (const [splitName, make] of Object.entries(SPLITS)) {
          const split = make(budget);
          const scores = COURSES.map((c) => {
            const sc: Scenario = {
              name: `${c.name}-${splitName}`,
              why: '',
              shape: 'spec-estimate',
              memory,
              days: c.exam,
              minutes: (day) => Math.round(split(day)[c.name] ?? 0),
              release: { atStart: 3, everyDays: 2.5 },
              examDate: true,
              tellsScope: true,
              scopeCutoffDays: 3,
              policy: 'today-button',
            };
            const runs = Array.from({ length: seeds }, (_, i) => simulate(sc, i + 1).metrics.expectedScore);
            return runs.reduce((a, b) => a + b, 0) / runs.length;
          });
          const pct = (x: number) => `${Math.round(x * 100)}%`;
          const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
          lines.push(`| ${budget} | ${memory} | ${splitName} | ${scores.map(pct).join(' | ')} | ${pct(mean)} |`);
        }
      }
    }
  } finally {
    Date.now = realNow;
  }
  writeFileSync('sim/results/several.md', lines.join('\n') + '\n');
});
