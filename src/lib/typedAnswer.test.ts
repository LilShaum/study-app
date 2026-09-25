import { describe, it, expect } from 'vitest';
import {
  acceptedForms,
  allowedSlips,
  BLANK,
  editDistance,
  gradeTyped,
  maskTerm,
  normalise,
  type Answerable,
} from './typedAnswer';

const t = (term: string, also_known_as?: string[]): Answerable => ({
  term,
  also_known_as,
});

// A slice of the real cell-signalling course, including its traps.
const COURSE: Answerable[] = [
  t('Exocytosis'),
  t('Endocytosis'),
  t('Atrial natriuretic peptide (ANP)'),
  t('Rough endoplasmic reticulum (rough ER)'),
  t('Smooth endoplasmic reticulum (smooth ER)'),
  t('Dissociation constant for hormone–carrier binding (Kd)'),
  t('Dissociation constant (Kd) for ligand–receptor binding'),
  t('Michaelis–Menten equation'),
  t('GABA'),
  t('Variable (regulated variable)'),
  t('Arginine vasopressin (AVP)', ['Vasopressin']),
  t('Receptor'),
];
const grade = (input: string, term: string) => gradeTyped(input, COURSE.find((a) => a.term === term)!, COURSE);

describe('normalise', () => {
  it.each([
    ['Michaelis–Menten', 'michaelis menten'], // en dash
    ['Michaelis-Menten', 'michaelis menten'], // hyphen
    ['  The  Receptor. ', 'receptor'], // article, spacing, punctuation
    ['Rough ER', 'rough er'],
    ['Gα', 'gα'], // Greek survives
    ['β-arrestin', 'β arrestin'],
  ])('%s → %s', (input, out) => expect(normalise(input)).toBe(out));
});

describe('acceptedForms', () => {
  it('accepts the term, the term without its brackets, and what is in them', () => {
    expect(acceptedForms(t('Atrial natriuretic peptide (ANP)')).map((f) => f.norm)).toEqual([
      'atrial natriuretic peptide anp',
      'atrial natriuretic peptide',
      'anp',
    ]);
  });

  it('adds the generator’s own other names', () => {
    expect(acceptedForms(t('Arginine vasopressin (AVP)', ['Vasopressin'])).map((f) => f.norm)).toContain('vasopressin');
  });
});

describe('editDistance', () => {
  it('counts a swap of neighbouring letters as one slip, not two', () => {
    expect(editDistance('recpetor', 'receptor')).toBe(1);
  });

  it.each([
    ['exocytosis', 'endocytosis', 2],
    ['kitten', 'sitting', 3],
    ['', 'abc', 3],
  ])('%s → %s is %i', (a, b, d) => expect(editDistance(a, b)).toBe(d));
});

describe('gradeTyped', () => {
  describe('forgives how it was typed', () => {
    it.each([
      ['exocytosis', 'Exocytosis'],
      ['michaelis-menten equation', 'Michaelis–Menten equation'],
      ['ANP', 'Atrial natriuretic peptide (ANP)'],
      ['atrial natriuretic peptide', 'Atrial natriuretic peptide (ANP)'],
      ['rough er', 'Rough endoplasmic reticulum (rough ER)'],
      ['vasopressin', 'Arginine vasopressin (AVP)'],
      ['the regulated variable', 'Variable (regulated variable)'],
    ])('"%s" for %s', (input, term) => expect(grade(input, term)).toEqual({ correct: true, kind: 'exact' }));

    it('accepts a slipped key and shows the right spelling', () => {
      expect(grade('exocytossis', 'Exocytosis')).toEqual({
        correct: true,
        kind: 'typo',
        spelled: 'Exocytosis',
      });
      expect(grade('recpetor', 'Receptor')).toEqual({
        correct: true,
        kind: 'typo',
        spelled: 'Receptor',
      });
    });

    it('accepts "Kd" for EITHER dissociation constant, though both carry it', () => {
      // Checking other terms before the asked one would call this a
      // confusion both times.
      expect(grade('Kd', 'Dissociation constant (Kd) for ligand–receptor binding').correct).toBe(true);
      expect(grade('Kd', 'Dissociation constant for hormone–carrier binding (Kd)').correct).toBe(true);
    });
  });

  describe('never forgives a confusion', () => {
    it('refuses endocytosis for exocytosis, though they are two edits apart', () => {
      expect(grade('endocytosis', 'Exocytosis')).toEqual({
        correct: false,
        kind: 'confused',
        with: 'Endocytosis',
      });
    });

    it('refuses a typo that lands nearer to a different term', () => {
      expect(grade('endocytossis', 'Exocytosis')).toMatchObject({
        correct: false,
        kind: 'confused',
      });
    });

    it('refuses rough ER when smooth ER was asked', () => {
      expect(grade('rough ER', 'Smooth endoplasmic reticulum (smooth ER)')).toMatchObject({
        correct: false,
        kind: 'confused',
        with: 'Rough endoplasmic reticulum (rough ER)',
      });
    });
  });

  describe('holds short symbols exactly', () => {
    it('allows no slips on four letters or fewer', () => {
      expect(allowedSlips(4)).toBe(0);
      expect(grade('GABB', 'GABA')).toEqual({ correct: false, kind: 'wrong' });
      expect(grade('gaba', 'GABA')).toEqual({ correct: true, kind: 'exact' });
    });
  });

  it('marks an empty or unrelated answer wrong', () => {
    expect(grade('   ', 'Exocytosis')).toEqual({
      correct: false,
      kind: 'wrong',
    });
    expect(grade('mitochondria', 'Exocytosis')).toEqual({
      correct: false,
      kind: 'wrong',
    });
  });
});

describe('maskTerm', () => {
  it('blanks the term where the definition names it, in any case', () => {
    expect(maskTerm('An amino acid messenger; glycine receptors are ligand-gated.', t('Glycine'))).toBe(
      `An amino acid messenger; ${BLANK} receptors are ligand-gated.`,
    );
  });

  it('blanks abbreviations and other names, the longest form first', () => {
    expect(
      maskTerm('A hormone (vasopressin); processed into AVP.', t('Arginine vasopressin (AVP)', ['Vasopressin'])),
    ).toBe(`A hormone (${BLANK}); processed into ${BLANK}.`);
  });

  it('takes a plural with it, and matches a hyphen for an en dash', () => {
    expect(maskTerm('Half of a gap junction; two hemichannels meet.', t('Hemichannel'))).toBe(
      `Half of a gap junction; two ${BLANK} meet.`,
    );
    expect(maskTerm('Solved by michaelis-menten kinetics.', t('Michaelis–Menten'))).toBe(
      `Solved by ${BLANK} kinetics.`,
    );
  });

  it('leaves a term inside a longer word alone', () => {
    expect(maskTerm('Rasterised figure of the pathway.', t('Ras'))).toBe('Rasterised figure of the pathway.');
  });
});
