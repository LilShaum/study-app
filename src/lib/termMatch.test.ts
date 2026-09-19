import { describe, expect, it } from 'vitest';
import { coversTokens, normaliseTerm, someTextCoversTerm, termTokens } from './termMatch';

describe('termTokens', () => {
  it('folds plurals so a singular declaration matches a plural title', () => {
    expect(coversTokens(termTokens('Isozymes'), termTokens('isozyme'))).toBe(true);
  });

  it('folds accents rather than splitting on them', () => {
    // Real case: the transcript said "Némethy", the generator wrote "Nemethy".
    expect(termTokens('Némethy')).toEqual(new Set(['nemethy']));
  });

  it('folds subscripts so a term is not reduced to one letter', () => {
    expect(termTokens('v₀')).toEqual(new Set(['v0']));
  });

  it('keeps short tokens whole', () => {
    expect(termTokens('Ki')).toEqual(new Set(['ki']));
  });
});

describe('normaliseTerm', () => {
  it('strips punctuation and case', () => {
    expect(normaliseTerm('Michaelis–Menten, (Km)!')).toBe('michaelis menten km');
  });
});

describe('someTextCoversTerm', () => {
  const questions = [
    'What does Km represent in the Michaelis–Menten equation?',
    'Define the Hill coefficient for haemoglobin.',
  ];

  it('matches a term through the parenthetical in its title', () => {
    // The bug this fixes: "Michaelis constant (Km)" was reported as never
    // tested in a course whose Km section holds eight questions about it.
    expect(someTextCoversTerm(questions, 'Michaelis constant (Km)')).toBe(false);
    expect(someTextCoversTerm(questions, 'Km')).toBe(true);
    expect(someTextCoversTerm(questions, 'Michaelis–Menten equation')).toBe(true);
  });

  it('requires one single text to cover the whole term', () => {
    // Joined, "Hill" and "equation" both appear across the pair and a term
    // needing both would falsely count as covered.
    expect(someTextCoversTerm(questions, 'Hill equation')).toBe(false);
    expect(someTextCoversTerm(questions, 'Hill coefficient')).toBe(true);
  });

  it('does not count a substring collision as coverage', () => {
    expect(someTextCoversTerm(['What does a kinase do?'], 'Ki')).toBe(false);
  });

  it('is false for an empty term', () => {
    expect(someTextCoversTerm(questions, '   ')).toBe(false);
  });
});
