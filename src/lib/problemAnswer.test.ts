import { describe, expect, it } from 'vitest';
import type { ProblemItem } from '@/schema/course';
import { answerKind, answerReached, checkAnswer, formatNumber, readNumber, shownAnswer, unitOf } from './problemAnswer';

const problem = (over: Partial<ProblemItem>): ProblemItem => ({ id: 'p1', type: 'problem', question: 'Q?', steps: ['Do it.'], ...over });

describe('readNumber', () => {
  it.each([
    ['0.0012', 0.0012],
    ['1.2e-3', 0.0012],
    ['1.2E-3', 0.0012],
    ['1.2 × 10^-3', 0.0012],
    ['1.2x10^-3', 0.0012],
    ['1.2×10⁻³', 0.0012],
    ['1.2 · 10⁻³', 0.0012],
    ['3/4', 0.75],
    ['−9.8', -9.8],
    ['-9.8 m/s²', -9.8],
    ['2π', 2 * Math.PI],
    ['2pi', 2 * Math.PI],
    ['√2/2', Math.SQRT2 / 2],
    ['sqrt(2)/2', Math.SQRT2 / 2],
    ['2√3', 2 * Math.sqrt(3)],
    ['(2)(3)', 6],
    ['1,000,000', 1e6],
    ['1,5', 1.5],
    ['x = 4', 4],
    ['ΔG° ≈ -2.5 kJ', -2.5],
    ['T₁ = 300 K', 300],
    ['= 7', 7],
    ['6.02 × 10²³', 6.02e23],
    ['log(100)', 2],
    ['e^2', Math.E ** 2],
    ['2^-1', 0.5],
  ])('reads %s', (typed, value) => {
    const read = readNumber(typed)?.value ?? NaN;
    expect(Math.abs(read - value) / Math.max(1, Math.abs(value))).toBeLessThan(1e-12);
  });

  it('keeps what follows the number as its unit', () => {
    expect(readNumber('4.9 m/s^2')?.unit).toBe('m/s^2');
    expect(readNumber('45%')?.unit).toBe('%');
    expect(readNumber('5 eV')?.unit).toBe('eV');
    expect(readNumber('12')?.unit).toBe('');
  });

  it('reads nothing that does not start with a number', () => {
    for (const typed of ['', 'four', 'O(n log n)', '-', '(', 'ln']) expect(readNumber(typed)).toBeNull();
  });

  it('knows the places a single number was given to', () => {
    expect(readNumber('1.70')?.literal).toEqual({ step: 0.01, figures: 3 });
    expect(readNumber('-17 N')?.literal).toEqual({ step: 1, figures: 2 });
    expect(readNumber('0.012')?.literal).toEqual({ step: 0.001, figures: 2 });
    expect(readNumber('3/4')?.literal).toBeUndefined();
  });
});

describe('answerKind', () => {
  it('a number, a string of one with its unit, text, or none', () => {
    expect(answerKind({ answer: 6 })).toBe('number');
    expect(answerKind({ answer: '4.9 m/s²' })).toBe('number');
    expect(answerKind({ answer: '45%' })).toBe('number');
    expect(answerKind({ answer: 'x = 4' })).toBe('number');
    expect(answerKind({ answer: 'O(n log n)' })).toBe('text');
    expect(answerKind({ answer: '3x^2 + 2' })).toBe('text');
    expect(answerKind({ answer: '3x' })).toBe('text');
    expect(answerKind({ answer: '2 or 3' })).toBe('text');
    expect(answerKind({ answer: '[1, 2, 3]' })).toBe('text');
    expect(answerKind({ answer: '  ' })).toBe('self');
    expect(answerKind({})).toBe('self');
  });
});

describe('checkAnswer: numbers', () => {
  const p = problem({ answer: 1.738, unit: 's' });

  it('right within 1%, or rounded to the places given from two figures', () => {
    for (const typed of ['1.738', '1.74', '1.73', '1.7', '1.7 s', 't = 1.74 s', '1.75']) expect(checkAnswer(p, typed)?.right, typed).toBe(true);
    for (const typed of ['2', '1.8', '1.6', '17.38', '-1.738']) expect(checkAnswer(p, typed)?.right, typed).toBe(false);
  });

  it('nothing counted when no number was typed', () => {
    expect(checkAnswer(p, '')).toBeNull();
    expect(checkAnswer(p, 'no idea')).toBeNull();
  });

  it('a problem can set its own tolerance', () => {
    const rough = problem({ answer: 100, tolerance: 0.1 });
    expect(checkAnswer(rough, '109')?.right).toBe(true);
    expect(checkAnswer(rough, '111')?.right).toBe(false);
  });

  it('zero is zero', () => {
    const z = problem({ answer: 0, unit: 'N' });
    expect(checkAnswer(z, '0')?.right).toBe(true);
    expect(checkAnswer(z, '0.0 N')?.right).toBe(true);
    expect(checkAnswer(z, '0.1')?.right).toBe(false);
  });

  it('a percentage typed as a share of one', () => {
    const pct = problem({ answer: 45, unit: '%' });
    expect(checkAnswer(pct, '45%')?.right).toBe(true);
    expect(checkAnswer(pct, '0.45')?.right).toBe(true);
    expect(checkAnswer(pct, '0.55')?.right).toBe(false);
  });

  it('big and small numbers in any notation', () => {
    const n = problem({ answer: 6.02e23 });
    for (const typed of ['6.02e23', '6.02 × 10^23', '6.02×10²³', '602000000000000000000000']) expect(checkAnswer(n, typed)?.right, typed).toBe(true);
    expect(checkAnswer(n, '6.02e22')?.right).toBe(false);
  });

  it('names the mistake a wrong answer comes from', () => {
    const m = problem({ answer: 6, unit: 'N', mistakes: [{ answer: 6000, why: 'The mass was left in grams.' }, { answer: '1.5', why: 'Divided instead of multiplied.' }] });
    expect(checkAnswer(m, '6000')).toEqual({ right: false, mistake: 'The mass was left in grams.' });
    expect(checkAnswer(m, '1.5 N')).toEqual({ right: false, mistake: 'Divided instead of multiplied.' });
    expect(checkAnswer(m, '7')).toEqual({ right: false });
  });
});

describe('checkAnswer: text', () => {
  const p = problem({ answer: 'O(n log n)', accept: ['O(nlog(n))'] });

  it('without case, spaces, quotes or a closing full stop', () => {
    for (const typed of ['O(n log n)', 'o(nlogn)', 'O(n log n).', '`O(n log n)`', 'O(n log(n))'.replace('log(n)', 'log n')]) expect(checkAnswer(p, typed)?.right, typed).toBe(true);
    expect(checkAnswer(p, 'O(nlog(n))')?.right).toBe(true);
    expect(checkAnswer(p, 'O(n^2)')?.right).toBe(false);
  });

  it('what code prints, exactly', () => {
    const out = problem({ answer: '[1, 2, 4]' });
    expect(checkAnswer(out, '[1,2,4]')?.right).toBe(true);
    expect(checkAnswer(out, '[1, 2, 3]')?.right).toBe(false);
  });

  it('superscripts and carets read the same', () => {
    expect(checkAnswer(problem({ answer: 'x²' }), 'x^2')?.right).toBe(true);
  });

  it('nothing to check without an answer', () => {
    expect(checkAnswer(problem({}), 'anything')).toBeNull();
  });
});

describe('showing the answer', () => {
  it('a number with its unit, big ones in powers of ten', () => {
    expect(shownAnswer(problem({ answer: 6, unit: 'N' }))).toBe('6 N');
    expect(shownAnswer(problem({ answer: '6.0', unit: 'N' }))).toBe('6.0 N');
    expect(shownAnswer(problem({ answer: '4.9 m/s²' }))).toBe('4.9 m/s²');
    expect(shownAnswer(problem({ answer: 6.02e23, unit: 'mol⁻¹' }))).toBe('6.02 × 10²³ mol⁻¹');
    expect(formatNumber(0.00001)).toBe('1 × 10⁻⁵');
    expect(formatNumber(1 / 3)).toBe('0.333333');
  });

  it('the unit as written', () => {
    expect(unitOf(problem({ answer: 4.9, unit: 'm/s²' }))).toBe('m/s²');
    expect(unitOf(problem({ answer: '4.9 m/s²' }))).toBe('m/s²');
    expect(unitOf(problem({ answer: '1.2e-3 m' }))).toBe('m');
    expect(unitOf(problem({ answer: '-273.15 °C' }))).toBe('°C');
    expect(unitOf(problem({ answer: 'O(n log n)' }))).toBe('');
  });
});

describe('a malformed optional field', () => {
  it('is as good as absent, never a crash', () => {
    const bad = problem({ answer: 6, accept: 'six' as unknown as string[], tolerance: 'lots' as unknown as number, mistakes: 'none' as unknown as [], unit: 3 as unknown as string });
    expect(checkAnswer(bad, '6')).toEqual({ right: true });
    expect(checkAnswer(bad, '7')).toEqual({ right: false });
    expect(shownAnswer(bad)).toBe('6');
    const odd = problem({ answer: 6, mistakes: [null, { answer: {}, why: 'x' }, { answer: 7, why: '' }, { answer: 8, why: 'Off by two.' }] as unknown as [] });
    expect(checkAnswer(odd, '8')).toEqual({ right: false, mistake: 'Off by two.' });
    expect(answerKind({ answer: { n: 1 } as unknown as number })).toBe('self');
  });
});

describe('answerReached', () => {
  it('finds the answer in the worked steps, however it is written', () => {
    expect(answerReached(problem({ answer: 6, steps: ['F = ma', 'F = 2.0 × 3.0 = 6.0 N'] }))).toBe(true);
    expect(answerReached(problem({ answer: 1.738, steps: ['T = 2π√(L/g)', 'T ≈ 1.74 s'] }))).toBe(true);
    expect(answerReached(problem({ answer: -9.8, steps: ['It falls at 9.8 m/s² downward.'] }))).toBe(true);
    expect(answerReached(problem({ answer: 0.0012, steps: ['= 1.2 × 10⁻³ mol'] }))).toBe(true);
    expect(answerReached(problem({ answer: 45, unit: '%', steps: ['0.45 of them'] }))).toBe(true);
    expect(answerReached(problem({ answer: 1000, steps: ['1,000 g in a kilogram'] }))).toBe(true);
  });

  it('flags an answer the steps never reach', () => {
    expect(answerReached(problem({ answer: 7, steps: ['F = ma', 'F = 2.0 × 3.0 = 6.0 N'] }))).toBe(false);
  });

  it('has nothing to say about an answer that is not a number', () => {
    expect(answerReached(problem({ answer: 'O(n)', steps: ['One pass.'] }))).toBeNull();
    expect(answerReached(problem({ steps: ['Prove it.'] }))).toBeNull();
  });
});

describe('a hostile answer', () => {
  it('a thousand brackets or powers neither crash nor hang', () => {
    const deep = '('.repeat(5000) + '1' + ')'.repeat(5000);
    expect(() => readNumber(deep)).not.toThrow();
    expect(() => answerKind({ answer: deep })).not.toThrow();
    expect(() => readNumber('2^'.repeat(5000) + '2')).not.toThrow();
    expect(checkAnswer(problem({ answer: 6 }), deep)).toBeNull();
  });
});
