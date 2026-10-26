import { describe, expect, it } from 'vitest';
import { answerPoints, isListOfNames, splitPoints } from './answerPoints';

describe('splitPoints', () => {
  it('splits a numbered model answer, keeping a closing sentence with the last point', () => {
    expect(splitPoints('(1) Liquid water. (2) Organic material. (3) Energy. But Earth is one example.')).toEqual({
      lead: '',
      points: ['Liquid water.', 'Organic material.', 'Energy. But Earth is one example.'],
      need: 3,
    });
  });

  it('keeps text before the first point as the lead', () => {
    expect(splitPoints('Three lines of evidence: 1) one code 2) one chirality')).toEqual({
      lead: 'Three lines of evidence:',
      points: ['one code', 'one chirality'],
      need: 2,
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
    expect(answerPoints({ back: 'Plate tectonics.', tags: ['short-answer'] })).toEqual({ lead: '', points: ['Plate tectonics.'], need: 1 });
  });

  it('leaves an ordinary flashcard a flip card', () => {
    expect(answerPoints({ back: 'The mitochondrion.', tags: ['cells'] })).toBeNull();
    expect(answerPoints({ back: 'The mitochondrion.' })).toBeNull();
  });
});

describe('answerPoints: how many make full marks', () => {
  it('is the number asked for when fewer than the points listed', () => {
    expect(answerPoints({ front: 'Name three organizations that give reliable advice.', back: 'Any three of: (1) A (2) B (3) C (4) D (5) E' })?.need).toBe(3);
    expect(answerPoints({ front: 'Which organizations?', back: 'Any 2 of: (1) A (2) B (3) C' })?.need).toBe(2);
  });

  it('is every point otherwise, and never reads marks as a number asked for', () => {
    expect(answerPoints({ front: 'What five qualities does it have?', back: '(1) A (2) B (3) C (4) D (5) E' })?.need).toBe(5);
    expect(answerPoints({ front: 'Short answer (3 marks): explain it.', back: '(1) A (2) B (3) C (4) D' })?.need).toBe(4);
    expect(answerPoints({ front: 'Name four parts.', back: '(1) A (2) B (3) C' })?.need).toBe(3);
  });
});

describe('isListOfNames', () => {
  it('calls a list of names, labels or short questions a list', () => {
    expect(isListOfNames(['Dietitians of Canada', 'Canadian Nutrition Society', 'Food Secure Canada', 'Obesity Canada'])).toBe(true);
    expect(isListOfNames(['Adequate', 'Moderate', 'Balanced', 'Nutrient-dense', 'Varied'])).toBe(true);
    expect(isListOfNames(['Was there a control and an experimental group?', 'Was the sample size large enough?', 'Was a placebo effectively administered?', 'Was it a double-blind study?'])).toBe(true);
    expect(isListOfNames(['Registered dietitian (RD) from Dietitians of Canada', 'Nutritionist with credentials', 'Professional with an advanced degree in nutrition (MS, MA or PhD)', 'Physician with appropriate expertise in nutrition'])).toBe(true);
  });

  it('does not call a list whose items each say what they are a list', () => {
    expect(isListOfNames(["Liquid water, the solvent life's chemistry needs.", 'Organic material, the carbon-based building blocks of life.', 'A source of energy to power it.'])).toBe(false);
  });

  it('does not call an explanation a list', () => {
    expect(
      isListOfNames([
        'Iron carries oxygen in haemoglobin, so too little means tiredness.',
        'Zinc is needed by many enzymes, which is why wounds heal slowly without it.',
      ]),
    ).toBe(false);
  });
});
