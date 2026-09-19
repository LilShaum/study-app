import { beforeEach, describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { useResumeStore, type Bookmark } from './resume';
import { useSessionStore } from './session';

const course = {
  schema_version: '1.0',
  metadata: { title: 'T' },
  sections: [
    {
      id: 's1',
      title: 'One',
      order: 1,
      items: [
        { id: 'a', type: 'definition', term: 'a', definition: 'd' },
        { id: 'b', type: 'flashcard', front: 'b', back: 'x' },
        { id: 'c', type: 'mcq', question: 'c', options: ['1', '2'], correct_index: 0 },
      ],
    },
  ],
} as unknown as Course;

const bookmark = (extra: Partial<Bookmark> = {}): Bookmark => ({
  mode: 'learn',
  sectionId: null,
  itemId: 'b',
  index: 1,
  total: 3,
  updatedAt: Date.now(),
  ...extra,
});

beforeEach(() => {
  useResumeStore.setState({ byCourse: {} });
});

describe('useResumeStore', () => {
  it('keeps one bookmark per course, the most recent winning', () => {
    useResumeStore.getState().save('c1', bookmark());
    useResumeStore.getState().save('c1', bookmark({ mode: 'quiz', itemId: 'c', index: 2 }));
    expect(useResumeStore.getState().getBookmark('c1')).toMatchObject({ mode: 'quiz', itemId: 'c' });
  });

  it('returns null for a course with no bookmark', () => {
    expect(useResumeStore.getState().getBookmark('nope')).toBeNull();
  });

  it('clears and restores, for delete-with-undo', () => {
    const b = bookmark();
    useResumeStore.getState().save('c1', b);
    useResumeStore.getState().clear('c1');
    expect(useResumeStore.getState().getBookmark('c1')).toBeNull();
    useResumeStore.getState().restore('c1', b);
    expect(useResumeStore.getState().getBookmark('c1')).toEqual(b);
  });

  it('restoring nothing is a no-op rather than storing a null', () => {
    useResumeStore.getState().restore('c1', null);
    expect(useResumeStore.getState().byCourse).toEqual({});
  });
});

describe('session init — resuming', () => {
  it('starts at the bookmarked item', () => {
    useSessionStore.getState().init('c1', course, 'learn', undefined, 'c');
    expect(useSessionStore.getState().index).toBe(2);
    expect(useSessionStore.getState().resumed).toBe(true);
  });

  it('falls back to the start when the item is gone', () => {
    // The item was edited away, or this mode filters it out.
    useSessionStore.getState().init('c1', course, 'learn', undefined, 'deleted-item');
    expect(useSessionStore.getState().index).toBe(0);
    expect(useSessionStore.getState().resumed).toBe(false);
  });

  it('resolves the id against the mode’s own list, not the course order', () => {
    // 'c' is the third item of the course but the only item quiz serves.
    useSessionStore.getState().init('c1', course, 'quiz', undefined, 'c');
    expect(useSessionStore.getState().index).toBe(0);
  });

  it('starts at the beginning when no bookmark is passed', () => {
    useSessionStore.getState().init('c1', course, 'learn');
    expect(useSessionStore.getState().index).toBe(0);
    expect(useSessionStore.getState().resumed).toBe(false);
  });

  it('tracks the section of the item it resumed at, not the first item', () => {
    useSessionStore.getState().init('c1', course, 'learn', undefined, 'c');
    expect(useSessionStore.getState().activeSectionId).toBe('s1');
  });
});
