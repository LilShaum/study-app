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
  ['Phloem', 'Carries sugars from the leaves to the rest of the plant'],
  ['Cuticle', 'Waxy layer that cuts water loss from the leaf surface'],
  ['Root hair', 'Thin outgrowth that takes up most of the water from soil'],
  ['Casparian strip', 'Waxy band that forces water through the endodermis cells'],
  ['Guttation', 'Droplets pushed out at leaf edges overnight'],
  ['Wilting', 'Loss of firmness when cells lose more water than they take in'],
  ['Turgor', 'Pressure of the cell contents against the wall'],
];
const items: StudyItem[] = [
  { id: 'rgc', type: 'definition', term: 'Guard cell', definition: 'One of the pair of cells that open and close a stoma' },
  // The typed term just asked is this card's answer.
  { id: 'anp', type: 'flashcard', front: 'Which cells open and close a stoma?', back: 'Guard cells.' },
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
