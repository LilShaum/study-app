import type { Scenario } from './engine';

/**
 * The standard suite. Each scenario says what question it answers; add one
 * when a new question comes up, and keep the old ones so results stay
 * comparable across changes to the app.
 */
const base = {
  shape: 'spec-estimate',
  memory: 'fsrs',
  days: 31,
  release: { atStart: 3, everyDays: 2.5 },
  examDate: true,
  policy: 'follow-app',
} as const;

export const SCENARIOS: Scenario[] = [
  { ...base, name: 'steady-30', why: 'The typical case: half an hour every day.', minutes: () => 30 },
  { ...base, name: 'steady-45', why: 'What 15 more minutes a day buys.', minutes: () => 45 },
  { ...base, name: 'steady-60', why: 'A committed student.', minutes: () => 60 },
  {
    ...base,
    name: 'busy-20',
    why: 'Real life: 20 minutes, Saturdays off, a missed day about one in six.',
    minutes: (d, r) => (d % 7 === 0 || r() < 0.17 ? 0 : 20),
  },
  {
    ...base,
    name: 'crammer',
    why: 'Ten minutes a day, then 90 in the last week.',
    minutes: (d) => (d >= 24 ? 90 : 10),
  },
  {
    ...base,
    name: 'steady-30-half-scope',
    why: 'A midterm on the first six sections only.',
    minutes: () => 30,
    scope: [0, 1, 2, 3, 4, 5],
  },
  {
    ...base,
    name: 'steady-30-no-date',
    why: 'The same student without telling the app the exam date.',
    minutes: () => 30,
    examDate: false,
  },
  {
    ...base,
    name: 'steady-30-old-prompt',
    why: 'The course shape the older prompt produced.',
    minutes: () => 30,
    shape: 'old-prompt',
  },
  {
    ...base,
    name: 'steady-30-harsh',
    why: 'Sensitivity: a student who forgets much faster. Conclusions should survive this.',
    minutes: () => 30,
    memory: 'harsh',
  },
  {
    ...base,
    name: 'steady-30-quota',
    why: 'Policy experiment: new material first, spread over the days left.',
    minutes: () => 30,
    policy: 'learn-quota-first',
  },
];
