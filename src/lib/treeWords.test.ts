import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { treeCounts, treeVersionOf, treeWords, TREE_VERSION } from './treeWords';

const DAY = 86_400_000;
const now = new Date(2026, 9, 1, 19).getTime();

/** A lecture of `n` sections, two scorable cards each. */
function lecture(n: number): Course {
  return {
    schema_version: '1.0',
    metadata: { title: 'Kinetics' },
    sections: Array.from({ length: n }, (_, i) => ({
      id: `s${i}`,
      title: `Section ${i}`,
      order: i + 1,
      items: [
        { id: `s${i}q`, type: 'mcq', question: 'q', options: ['a', 'b', 'c', 'd'], correct_index: 0 },
        { id: `s${i}f`, type: 'flashcard', front: 'f', back: 'b' },
      ],
    })),
  } as unknown as Course;
}

/** Answered right, long enough ago to have faded past the review point. */
const faded: ItemResult = { got: 1, missed: 0, lastSeen: now - 30 * DAY };
/** Answered right just now. */
const fresh: ItemResult = { got: 2, missed: 0, lastSeen: now };

describe('treeCounts', () => {
  it('counts a section that has lost what it held as fading, and an untouched one as not started', () => {
    const counts = treeCounts(lecture(3), { s0q: faded, s0f: faded, s1q: fresh, s1f: fresh }, now);
    expect(counts.fading.map((s) => s.title)).toEqual(['Section 0']);
    expect(counts.fading[0].due).toBe(2);
    expect(counts.bare).toBe(1);
    expect(counts.sections.map((s) => s.state)).toEqual(['fading', 'held', 'bare']);
  });

  it('does not call a section fading for a card missed and never yet got right', () => {
    // Due within hours, and never learned: the tree drops no leaf for it, so
    // the words must not say it is fading (the owner, 2026-11-03).
    const missed: ItemResult = { got: 0, missed: 2, lastSeen: now - 5 * 3_600_000 };
    const counts = treeCounts(lecture(1), { s0q: missed, s0f: fresh }, now);
    expect(counts.sections[0].due).toBeGreaterThan(0);
    expect(counts.sections[0].state).toBe('held');
    expect(counts.fading).toEqual([]);
  });

  it('puts the section closest to gone first', () => {
    const counts = treeCounts(lecture(2), { s0q: faded, s0f: fresh, s1q: faded, s1f: faded }, now);
    expect(counts.fading.map((s) => s.id)).toEqual(['s1', 's0']);
  });

  it('counts nothing as fading in a lecture never studied', () => {
    const counts = treeCounts(lecture(4), {}, now);
    expect(counts.fading).toEqual([]);
    expect(counts.bare).toBe(4);
  });
});

describe('treeWords', () => {
  const words = (progress: Record<string, ItemResult>, n = 3) => treeWords(treeCounts(lecture(n), progress, now));

  it('says the sections, what is fading and what has not been started', () => {
    expect(words({ s0q: faded, s0f: faded, s1q: fresh, s1f: fresh })).toBe('3 sections · 1 fading · 1 not started');
  });

  it('says so plainly when nothing is fading', () => {
    expect(words({ s0q: fresh, s0f: fresh }, 1)).toBe('1 section · nothing fading');
  });

  it('has something to say about an empty lecture', () => {
    expect(words({}, 0)).toBe('Nothing in this lecture yet');
  });
});

describe('treeVersionOf', () => {
  it('takes the three versions and nothing else', () => {
    expect(['1', '2', '3'].map(treeVersionOf)).toEqual([1, 2, 3]);
    expect(['', '4', 'map'].map(treeVersionOf)).toEqual([TREE_VERSION, TREE_VERSION, TREE_VERSION]);
    expect(treeVersionOf(null)).toBe(TREE_VERSION);
  });
});
