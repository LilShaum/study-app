import { beforeEach, describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { buildSessionItems, recallId } from './buildSessionItems';
import { tooClose } from './learnSteps';
import { todaySitting } from './todaySitting';
import { usePlanStore } from '@/store/plan';
import { useCoursesStore } from '@/store/courses';

/**
 * Found by the fresh-eyes review (docs/audits/2026-10-13-fresh-eyes.md) with
 * sim/lecture.sim.ts on the owner's lectures, in studied states.
 */

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 13, 19).getTime();

const TERMS: [string, string][] = [
  ['Insulin', 'Lowers blood glucose after a meal'],
  ['Glucagon', 'Raises blood glucose between meals'],
  ['Somatostatin', 'Made by delta cells of the islet'],
  ['Oxytocin', 'Drives uterine contraction during childbirth'],
  ['Prolactin', 'Stimulates milk production in the breast'],
  ['Dopamine', 'Inhibits prolactin release from the anterior pituitary'],
  ['Cortisol', 'Steroid released by the adrenal cortex under stress'],
];
const items: StudyItem[] = [
  { id: 'rgc', type: 'definition', term: 'Receptor guanylate cyclase', definition: 'Membrane receptor-enzyme used by atrial natriuretic peptide' },
  // The typed term just asked is this card's answer.
  { id: 'anp', type: 'flashcard', front: 'Through which type of receptor does atrial natriuretic peptide act?', back: 'Receptor guanylate cyclase.' },
  ...TERMS.map(([term, definition], n) => ({ id: `d${n}`, type: 'definition', term, definition })),
] as StudyItem[];
const course = { schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's', title: 'S', items }] } as Course;

// Everything answered right once, two days ago: all due together, at one urgency.
const ids = [recallId('rgc'), 'anp', ...TERMS.map((_, n) => recallId(`d${n}`))];
const progress = Object.fromEntries(ids.map((id) => [id, { got: 1, missed: 0, lastSeen: NOW - 2 * DAY, stability: 2, before: null }]));

describe('Review never asks a card straight after one that answers it', () => {
  it('in a Review sitting', () => {
    const list = buildSessionItems(course, 'review', { progress, now: NOW, minutes: 30 });
    expect(list).toHaveLength(ids.length);
    expect(tooClose(list)).toBeNull();
  });

  it("in Today's review part", () => {
    const list = buildSessionItems(course, 'today', { progress, now: NOW, minutes: 30 }).filter((i) => i._block === 'review');
    expect(list).toHaveLength(ids.length);
    expect(tooClose(list)).toBeNull();
  });
});

describe('Keep going in the last days before an exam', () => {
  beforeEach(() => {
    usePlanStore.setState({ byCourse: { c: { minutes: 120 } }, total: null });
  });

  it('plans one more part, not the whole day again', () => {
    const d = new Date(NOW + 2 * DAY);
    const exam_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dated = { ...course, metadata: { ...course.metadata, exam_date } };
    useCoursesStore.setState({ courses: { c: dated } });
    expect(todaySitting('c', dated, {}, NOW, true).minutes).toBe(40);
  });

  it('is the full day when the day is one sitting', () => {
    useCoursesStore.setState({ courses: { c: course } });
    expect(todaySitting('c', course, {}, NOW, true).minutes).toBe(120);
  });
});
