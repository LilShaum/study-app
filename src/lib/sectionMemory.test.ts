import { describe, expect, it } from 'vitest';
import type { Section } from '@/schema/course';
import { heldShare, sectionMemory } from './sectionMemory';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const section = {
  id: 's',
  title: 'S',
  items: [1, 2, 3, 4, 5].map((n) => ({ id: `q${n}`, type: 'flashcard', front: `f${n}`, back: `b${n}` })),
} as unknown as Section;

const right = (at: number, stability = 2) => ({ got: 1, missed: 0, lastSeen: at, stability, lastGot: true });
const wrong = (at: number) => ({ got: 0, missed: 1, lastSeen: at, stability: 1, lastGot: false });

describe('what a section still holds, the tree’s leaves', () => {
  it('a section studied today keeps its leaves, misses and all', () => {
    const now = 10 * DAY;
    const at = now - 6 * HOUR;
    const progress = { q1: right(at), q2: right(at), q3: right(at), q4: wrong(at), q5: wrong(at) };
    expect(heldShare(section, progress, now)).toBe(1);
    const m = sectionMemory(section, progress, now);
    expect(m.held).toBe(m.learned);
  });

  it('a card never yet got right is not counted as forgotten, however long ago', () => {
    const now = 40 * DAY;
    expect(heldShare(section, { q1: right(now - HOUR), q2: wrong(now - 30 * DAY) }, now)).toBe(1);
  });

  it('loses leaves as cards fade past the point where Review asks them, and in part below it', () => {
    const now = 40 * DAY;
    const faded = heldShare(section, { q1: right(now - 3 * DAY), q2: right(now - HOUR) }, now);
    expect(faded).toBeLessThan(1);
    expect(faded).toBeGreaterThan(0.5);
    expect(heldShare(section, { q1: right(now - 30 * DAY), q2: right(now - 30 * DAY) }, now)).toBeLessThan(0.05);
  });

  it('a card got right before and missed since is forgetting, once it fades', () => {
    const now = 40 * DAY;
    const lapsed = { got: 1, missed: 1, lastSeen: now - 2 * DAY, stability: 0.5, lastGot: false };
    expect(heldShare(section, { q1: lapsed }, now)).toBeLessThan(1);
  });
});
