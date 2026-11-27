import { describe, expect, it } from 'vitest';
import { partCount } from './partCount';
import type { Course } from '@/schema/course';
import type { SessionItem } from './buildSessionItems';

const course = { sections: [{ id: 'a', items: [] }, { id: 'b', items: [] }] } as unknown as Course;
const item = (sid: string, review = false) => ({ id: Math.random().toString(), _sectionId: sid, ...(review ? { _block: 'review' } : {}) }) as unknown as SessionItem;

describe('partCount', () => {
  const items = [item('b', true), item('a', true), item('a'), item('a'), item('a'), item('b')];
  it('counts the review run on its own', () => {
    expect(partCount(items, 1, course)).toBe('Review · 2 of 2');
  });
  it('counts within the section after it', () => {
    expect(partCount(items, 3, course)).toBe('Section 1 · 2 of 3');
    expect(partCount(items, 5, course)).toBe('Section 2 · 1 of 1');
  });
});
