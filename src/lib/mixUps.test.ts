import { describe, expect, it } from 'vitest';
import type { Course, McqItem } from '@/schema/course';
import { buildSessionItems } from './buildSessionItems';
import { mixUps, termPicked } from './mixUps';

const mcq: McqItem = {
  id: 'q',
  type: 'mcq',
  question: 'Which cells wrap axons in the central nervous system?',
  options: ['Oligodendrocytes', 'Schwann cells', 'Astrocytes', 'Neurons that fire'],
  correct_index: 0,
};

const course = {
  schema_version: '1.0',
  metadata: { title: 'Glia' },
  sections: [
    {
      id: 's',
      title: 'Glia',
      items: [
        { id: 'oli', type: 'definition', term: 'Oligodendrocytes', definition: 'Glia that myelinate several central axons each' },
        { id: 'sch', type: 'definition', term: 'Schwann cell', definition: 'Glia that myelinate one peripheral axon each', also_known_as: ['Schwann cells'] },
        { id: 'ast', type: 'definition', term: 'Astrocytes', definition: 'Star-shaped glia that hold the blood–brain barrier' },
        mcq,
      ],
    },
  ],
} as unknown as Course;

describe('termPicked', () => {
  it('names the term a wrong pick is, by any of its names', () => {
    expect(termPicked(course, mcq, 1)).toBe('sch');
    expect(termPicked(course, mcq, 2)).toBe('ast');
  });

  it('is nothing for the right answer, or a pick that is not a term', () => {
    expect(termPicked(course, mcq, 0)).toBeUndefined();
    expect(termPicked(course, mcq, 3)).toBeUndefined();
  });
});

describe('a mix-up from a pick', () => {
  const day = 86_400_000;
  const now = 50 * day;
  const progress = {
    q: { got: 0, missed: 1, lastSeen: now - 10 * day, stability: 1, lastGot: false, missedAt: now - 10 * day, confusedWith: ['sch'] },
  };

  it('brings the term picked straight after the question in Review', () => {
    const ids = buildSessionItems(course, 'review', { progress, now }).map((i) => i.id);
    expect(ids.indexOf('sch~recall')).toBe(ids.indexOf('q') + 1);
  });

  it('is listed on Progress by its question, with the term answered', () => {
    expect(mixUps(course, progress)).toEqual([{ id: 'q', asked: mcq.question, with: ['Schwann cell'], at: now - 10 * day }]);
  });

  it('lists a typed mix-up by its term', () => {
    const typed = { 'oli~recall': { got: 0, missed: 1, lastSeen: 5, lastGot: false, confusedWith: ['ast'] } };
    expect(mixUps(course, typed).map((m) => [m.asked, m.with])).toEqual([['Oligodendrocytes', ['Astrocytes']]]);
  });
});
