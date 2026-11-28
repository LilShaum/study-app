import { describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { ADAPTIVE_NEW_MIN, ADAPTIVE_REVIEW, ADAPTIVE_WINDOW, buildSessionItems } from './buildSessionItems';
import type { ItemResult } from '@/store/progress';

const NOW = new Date('2026-11-24T10:00:00').getTime();
const DAY = 86_400_000;
const mcq = (id: string, difficulty = 'medium'): StudyItem =>
  ({ id, type: 'mcq', question: `${id}?`, options: ['a', 'b', 'c', 'd'], correct_index: 0, difficulty, source_excerpt: 'x' }) as StudyItem;
const course = (n: number) =>
  ({
    schema_version: '1.0',
    metadata: { title: 'Q' },
    sections: [
      { id: 's1', title: 'One', items: Array.from({ length: n }, (_, i) => mcq(`q${i}`, i % 3 === 0 ? 'hard' : i % 3 === 1 ? 'easy' : 'medium')) },
      { id: 's2', title: 'Two', items: [{ id: 'd1', type: 'definition', term: 'Alpha', definition: 'The first letter used here' }, { id: 'e1', type: 'explain', title: 'Why', text: 'Because.' }] },
    ],
  }) as unknown as Course;
const fading = (ids: string[]): Record<string, ItemResult> =>
  Object.fromEntries(ids.map((id) => [id, { got: 1, missed: 0, lastSeen: NOW - 40 * DAY, stability: 2, difficulty: 5 } as ItemResult]));

describe('the adaptive quiz plans in windows of ten (docs/proposals/zen.md)', () => {
  it('asks what is due first, keeps two slots for new cards, never a reading card', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `q${i}`);
    const progress = fading(ids);
    const w = buildSessionItems(course(30), 'adaptive', { progress, now: NOW });
    expect(w).toHaveLength(ADAPTIVE_WINDOW);
    expect(w.some((i) => i.type === 'explain' || i.type === 'definition')).toBe(false);
    expect(w.filter((i) => progress[i.id])).toHaveLength(ADAPTIVE_WINDOW - ADAPTIVE_NEW_MIN);
  });

  it('with little due, fills the rest with new cards from the sections met', () => {
    const progress = fading(['q0']);
    const w = buildSessionItems(course(30), 'adaptive', { progress, now: NOW });
    expect(w).toHaveLength(ADAPTIVE_WINDOW);
    expect(w.filter((i) => progress[i.id])).toHaveLength(1);
    expect(ADAPTIVE_REVIEW).toBe(3);
  });

  it('leaves out what the sitting already has, and keeps going on what is held least well', () => {
    const all = buildSessionItems(course(12), 'adaptive', { progress: {}, now: NOW });
    const exclude = new Set(all.map((i) => i.id));
    const next = buildSessionItems(course(12), 'adaptive', { progress: {}, now: NOW, exclude });
    expect(next.some((i) => exclude.has(i.id))).toBe(false);
    // With nothing due or new left, the strong ones still come, weakest first.
    const held = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`q${i}`, { got: 3, missed: 0, lastSeen: NOW - DAY, stability: 30, difficulty: 5 } as ItemResult]));
    expect(buildSessionItems(course(12), 'adaptive', { progress: held, now: NOW }).length).toBeGreaterThan(0);
  });
});

describe('the adaptive quiz and sections never studied (simulator, 2026-11-24)', () => {
  it('draws new cards only from sections already met', () => {
    const c = course(12);
    expect(buildSessionItems(c, 'adaptive', { progress: {}, now: NOW })).toEqual([]);
    const met = { q0: { got: 1, missed: 0, lastSeen: NOW - DAY, stability: 30, difficulty: 5 } as ItemResult };
    const w = buildSessionItems(c, 'adaptive', { progress: met, now: NOW });
    expect(w.length).toBeGreaterThan(1);
    expect(w.every((i) => i._sectionId === 's1')).toBe(true);
  });
});
