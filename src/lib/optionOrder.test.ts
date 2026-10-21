import { describe, expect, it } from 'vitest';
import type { McqItem } from '@/schema/course';
import { inOrder, optionOrder } from './optionOrder';

const item: McqItem = {
  id: 'q',
  type: 'mcq',
  question: 'Which?',
  options: ['right', 'w1', 'w2', 'w3'],
  correct_index: 0,
  distractor_rationale: ['', 'no 1', 'no 2', 'no 3'],
};

describe('optionOrder', () => {
  it('is a fixed order for one seed and a permutation of every option', () => {
    const a = optionOrder(item.options, 'seed-1');
    expect(optionOrder(item.options, 'seed-1')).toEqual(a);
    expect([...a].sort()).toEqual([0, 1, 2, 3]);
  });

  it('puts the right answer in every position across showings', () => {
    const where = new Set<number>();
    for (let k = 0; k < 200; k++) where.add(optionOrder(item.options, `s${k}`).indexOf(0));
    expect([...where].sort()).toEqual([0, 1, 2, 3]);
  });

  it('keeps the written order when an option points at the others', () => {
    for (const last of ['All of the above', 'None of these', 'Both of the above', 'A and C', '(B) or (D)'])
      expect(optionOrder(['a', 'b', 'c', last], 'x')).toEqual([0, 1, 2, 3]);
    // Letters inside an answer are not pointers.
    const dna = ['T attaches to A and C to G', 'b', 'c', 'd'];
    expect(new Set(['x', 'y', 'z', 'w'].map((s) => optionOrder(dna, s).join())).size).toBeGreaterThan(1);
  });
});

describe('inOrder', () => {
  it('moves the key and each note with its option', () => {
    const shown = inOrder(item, [2, 0, 3, 1]);
    expect(shown.options).toEqual(['w2', 'right', 'w3', 'w1']);
    expect(shown.correct_index).toBe(1);
    expect(shown.distractor_rationale).toEqual(['no 2', '', 'no 3', 'no 1']);
  });

  it('places notes written one per wrong option, and leaves a broken key alone', () => {
    expect(inOrder({ ...item, distractor_rationale: ['no 1', 'no 2', 'no 3'] }, [3, 2, 1, 0]).distractor_rationale).toEqual(['no 3', 'no 2', 'no 1', '']);
    const broken = { ...item, correct_index: 9 };
    expect(inOrder(broken, [3, 2, 1, 0])).toBe(broken);
  });
});
