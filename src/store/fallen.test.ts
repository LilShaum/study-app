import { beforeEach, describe, expect, it } from 'vitest';
import { useFallenStore } from './fallen';

const get = () => useFallenStore.getState();

describe('fallen leaves', () => {
  beforeEach(() => get().clear());

  it('remembers where a section has already fallen from', () => {
    get().fell('c', 's1', 4);
    expect(get().byCourse.c.s1).toBe(4);
  });

  it('moves up when leaves grow back, so they can fall again', () => {
    get().fell('c', 's1', 4);
    get().sync('c', { s1: 7 });
    expect(get().byCourse.c.s1).toBe(7);
  });

  it('does not move down on a new loss — that is what is left to fall', () => {
    get().fell('c', 's1', 4);
    get().sync('c', { s1: 2 });
    expect(get().byCourse.c.s1).toBe(4);
  });

  it('forgets a section that has lost nothing', () => {
    get().fell('c', 's1', 4);
    get().sync('c', { s1: null });
    expect(get().byCourse.c.s1).toBeUndefined();
  });

  it('clears one course without touching another', () => {
    get().fell('a', 's1', 1);
    get().fell('b', 's1', 2);
    get().clear('a');
    expect(get().byCourse).toEqual({ b: { s1: 2 } });
  });
});
