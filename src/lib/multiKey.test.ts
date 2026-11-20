import { describe, expect, it } from 'vitest';
import { negativeMulti } from './multiKey';

describe('negativeMulti', () => {
  it('reads NOT or EXCEPT in capitals as the negative framing, and ordinary prose as not', () => {
    expect(negativeMulti('Which of these do NOT apply to myelin?')).toBe(true);
    expect(negativeMulti('All of these are true of myelin EXCEPT')).toBe(true);
    expect(negativeMulti('Which are true of a cell that does not divide?')).toBe(false);
    expect(negativeMulti('Which apply, except in the embryo?')).toBe(false);
    expect(negativeMulti(undefined)).toBe(false);
  });
});
