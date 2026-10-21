import { describe, expect, it } from 'vitest';
import { answerPoints, splitPoints } from './answerPoints';

describe('splitPoints', () => {
  it('splits a numbered model answer, keeping a closing sentence with the last point', () => {
    expect(splitPoints('(1) Liquid water. (2) Organic material. (3) Energy. But Earth is one example.')).toEqual({
      lead: '',
      points: ['Liquid water.', 'Organic material.', 'Energy. But Earth is one example.'],
    });
  });

  it('keeps text before the first point as the lead', () => {
    expect(splitPoints('Three lines of evidence: 1) one code 2) one chirality')).toEqual({
      lead: 'Three lines of evidence:',
      points: ['one code', 'one chirality'],
    });
  });

  it('takes the numbers only in order, so a quantity in a point stays in it', () => {
    expect(splitPoints('(1) Takes 2) hours, not one. (2) Then (4) cools.')?.points).toEqual(['Takes 2) hours, not one.', 'Then (4) cools.']);
  });

  it('is null for a back with one point or none', () => {
    expect(splitPoints('Photosynthesis (1) only')).toBeNull();
    expect(splitPoints('t = 4.5 × 10⁹ years × 0.515 ≈ 2.3 × 10⁹ years.')).toBeNull();
  });
});

describe('answerPoints', () => {
  it('makes a tagged short-answer card with an unnumbered back one point', () => {
    expect(answerPoints({ back: 'Plate tectonics.', tags: ['short-answer'] })).toEqual({ lead: '', points: ['Plate tectonics.'] });
  });

  it('leaves an ordinary flashcard a flip card', () => {
    expect(answerPoints({ back: 'The mitochondrion.', tags: ['cells'] })).toBeNull();
    expect(answerPoints({ back: 'The mitochondrion.' })).toBeNull();
  });
});
