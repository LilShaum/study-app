import { describe, it, expect } from 'vitest';
import type { Course, Section, StudyItem } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { sectionStats, availableModes, findSection } from './sectionStats';
import { buildSessionItems } from './buildSessionItems';

const mcq = (id: string): StudyItem =>
  ({ id, type: 'mcq', question: id, options: ['a', 'b', 'c', 'd'], correct_index: 0, explanation: 'x' }) as StudyItem;
const card = (id: string): StudyItem => ({ id, type: 'flashcard', front: id, back: 'b' }) as StudyItem;
const def = (id: string): StudyItem => ({ id, type: 'definition', term: id, definition: 'd' }) as StudyItem;

const s1: Section = { id: 's1', title: 'One', order: 1, items: [mcq('a1'), card('a2'), def('a3')] } as Section;
const s2: Section = { id: 's2', title: 'Two', order: 2, items: [mcq('b1'), def('b2')] } as Section;
const course = { schema_version: '1.0', metadata: { title: 'C' }, sections: [s2, s1] } as Course;

const progress: Record<string, ItemResult> = {
  a1: { got: 3, missed: 1, lastSeen: 1 },
  a2: { got: 0, missed: 2, lastSeen: 1 },
  b1: { got: 1, missed: 1, lastSeen: 1 },
  // a3/b2 are definitions — never scored, so never appear here.
};

describe('sectionStats', () => {
  it('scores only the gradable items in the section', () => {
    const st = sectionStats(s1, progress);
    expect(st).toMatchObject({ id: 's1', total: 3, gradable: 2, studied: 2, got: 3, missed: 3 });
    expect(st.accuracy).toBe(50); // 3 of 6 attempts
  });

  it('does not leak another section\u2019s attempts in', () => {
    // b1 has attempts but belongs to s2 — s1's figures must not include it.
    expect(sectionStats(s1, progress).got).toBe(3);
    expect(sectionStats(s2, progress)).toMatchObject({ got: 1, missed: 1, studied: 1 });
  });

  it('reports null accuracy when nothing here has been attempted', () => {
    const fresh = sectionStats(s1, {});
    expect(fresh.accuracy).toBeNull();
    expect(fresh.studied).toBe(0);
  });

  it('counts items by type', () => {
    expect(sectionStats(s1, progress).byType).toEqual({ mcq: 1, flashcard: 1, definition: 1 });
  });
});

describe('availableModes', () => {
  it('reports what each mode would actually serve', () => {
    expect(availableModes(s1)).toEqual({ learn: 3, quiz: 1, flashcards: 1, definitions: 1, mixed: 3, weakest: 2 });
  });

  it('reports zero for a mode with nothing in this section', () => {
    expect(availableModes(s2)).toMatchObject({ flashcards: 0, quiz: 1, definitions: 1 });
  });
});

describe('findSection', () => {
  it('finds by id regardless of array order', () => {
    expect(findSection(course, 's1')?.title).toBe('One');
  });
  it('returns undefined for an unknown id', () => {
    expect(findSection(course, 'nope')).toBeUndefined();
  });
});

describe('buildSessionItems — section scoping', () => {
  it('serves the whole course when no section is given', () => {
    expect(buildSessionItems(course, 'mixed')).toHaveLength(5);
  });

  it('serves only the named section', () => {
    const items = buildSessionItems(course, 'mixed', { sectionId: 's1' });
    expect(items).toHaveLength(3);
    expect(items.every((i) => i._sectionId === 's1')).toBe(true);
  });

  it('applies the mode filter within the section', () => {
    expect(buildSessionItems(course, 'quiz', { sectionId: 's1' }).map((i) => i.id)).toEqual(['a1']);
    expect(buildSessionItems(course, 'definitions', { sectionId: 's2' }).map((i) => i.id)).toEqual(['b2']);
  });

  it('returns nothing for a mode the section cannot fill', () => {
    // s2 has no flashcards; an empty list is what drives the empty state.
    expect(buildSessionItems(course, 'flashcards', { sectionId: 's2' })).toHaveLength(0);
  });

  it('scopes Review Missed to the section too', () => {
    const missed = new Set(['a1', 'b1']);
    expect(buildSessionItems(course, 'missed', { missedIds: missed, sectionId: 's1' }).map((i) => i.id)).toEqual(['a1']);
  });

  it('returns nothing for an unknown section id', () => {
    // SessionRoute guards against this before it gets here, but the builder
    // should not silently fall back to the whole course.
    expect(buildSessionItems(course, 'mixed', { sectionId: 'nope' })).toHaveLength(0);
  });
});
