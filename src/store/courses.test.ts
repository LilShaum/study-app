import { beforeEach, describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { useCoursesStore } from './courses';

const makeCourse = (title: string, code?: string): Course =>
  ({
    schema_version: '1.0',
    metadata: { title, ...(code ? { course_code: code } : {}) },
    sections: [
      {
        id: 's1',
        title: 'S',
        items: [
          { id: 'a', type: 'flashcard', front: 'A', back: 'a' },
          { id: 'b', type: 'flashcard', front: 'B', back: 'b' },
          { id: 'c', type: 'flashcard', front: 'C', back: 'c' },
        ],
      },
    ],
  }) as unknown as Course;

beforeEach(() => {
  useCoursesStore.setState({ courses: {} });
});

describe('addCourse id allocation', () => {
  it('derives the id from course_code the way the vanilla app did', () => {
    const id = useCoursesStore.getState().addCourse(makeCourse('Cell Biology', 'BIOL 200'));
    expect(id).toBe('biol_200');
  });

  it('overwrites when the same course is re-imported (regenerated content)', () => {
    const store = useCoursesStore.getState();
    const first = store.addCourse(makeCourse('Cell Biology', 'BIOL200'));
    const second = store.addCourse(makeCourse('Cell Biology', 'BIOL200'));
    expect(second).toBe(first);
    expect(Object.keys(useCoursesStore.getState().courses)).toHaveLength(1);
  });

  // The slug is lossy, so genuinely different courses can collide and used to
  // silently destroy each other.
  it('suffixes rather than overwriting when a different course collides', () => {
    // "BIOL 200" and "biol-200" both slug to biol_200, but these are two
    // different courses — the first must survive.
    const first = useCoursesStore.getState().addCourse(makeCourse('Cell Biology', 'BIOL 200'));
    const second = useCoursesStore.getState().addCourse(makeCourse('Biology 200 Review', 'biol-200'));

    expect(first).toBe('biol_200');
    expect(second).toBe('biol_200_2');
    expect(Object.keys(useCoursesStore.getState().courses)).toHaveLength(2);
    expect(useCoursesStore.getState().courses[first].metadata.title).toBe('Cell Biology');
  });
});

describe('item editing', () => {
  it('replaces an item in place', () => {
    const id = useCoursesStore.getState().addCourse(makeCourse('C'));
    const updated = { id: 'b', type: 'flashcard', front: 'B!', back: 'edited' } as StudyItem;
    useCoursesStore.getState().updateItem(id, 's1', 'b', updated);

    const items = useCoursesStore.getState().courses[id].sections[0].items;
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(items[1]).toMatchObject({ back: 'edited' });
  });

  // Undo used to append to the end, quietly reordering the section.
  it('deleteItem reports the index so undo can restore position', () => {
    const store = useCoursesStore.getState();
    const id = store.addCourse(makeCourse('C'));

    const removed = useCoursesStore.getState().deleteItem(id, 's1', 'b');
    expect(removed).not.toBeNull();
    expect(removed!.index).toBe(1);
    expect(useCoursesStore.getState().courses[id].sections[0].items.map((i) => i.id)).toEqual(['a', 'c']);

    useCoursesStore.getState().insertItem(id, 's1', removed!.item, removed!.index);
    expect(useCoursesStore.getState().courses[id].sections[0].items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns null when deleting something that is not there', () => {
    const id = useCoursesStore.getState().addCourse(makeCourse('C'));
    expect(useCoursesStore.getState().deleteItem(id, 's1', 'nope')).toBeNull();
  });

  it('appends when no index is given', () => {
    const id = useCoursesStore.getState().addCourse(makeCourse('C'));
    const item = { id: 'd', type: 'flashcard', front: 'D', back: 'd' } as StudyItem;
    useCoursesStore.getState().insertItem(id, 's1', item);
    expect(useCoursesStore.getState().courses[id].sections[0].items.map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });
});
