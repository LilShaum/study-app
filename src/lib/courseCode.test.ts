import { describe, expect, it } from 'vitest';
import { normalizeCourseCode, withNormalCode } from './courseCode';

describe('normalizeCourseCode (the owner, 2026-11-22: always "BIOL 365")', () => {
  it('puts one space between the letters and the number, in capitals', () => {
    expect(normalizeCourseCode('BIOL365')).toBe('BIOL 365');
    expect(normalizeCourseCode('biol 365')).toBe('BIOL 365');
    expect(normalizeCourseCode(' PSYC-351c ')).toBe('PSYC 351C');
    expect(normalizeCourseCode('BIOL  365')).toBe('BIOL 365');
  });
  it('leaves anything else as written, trimmed', () => {
    expect(normalizeCourseCode('Intro to Philosophy')).toBe('Intro to Philosophy');
    expect(normalizeCourseCode('')).toBe('');
    expect(normalizeCourseCode(undefined)).toBeUndefined();
  });
  it('keeps the same object when the code is already right', () => {
    const c = { metadata: { course_code: 'BIOL 365' } };
    expect(withNormalCode(c)).toBe(c);
    expect(withNormalCode({ metadata: { course_code: 'BIOL365' } }).metadata.course_code).toBe('BIOL 365');
  });
});
