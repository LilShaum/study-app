import { describe, it, expect, beforeEach } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { useSessionStore } from './session';

function mcq(id: string, question: string): StudyItem {
  return {
    id,
    type: 'mcq',
    question,
    options: ['a', 'b', 'c', 'd'],
    correct_index: 0,
    explanation: 'x',
  } as StudyItem;
}

const course = {
  schema_version: '1.0',
  metadata: { title: 'Net' },
  sections: [{ id: 's1', title: 'One', items: [mcq('q1', 'A?'), mcq('q2', 'B?')] }],
} as Course;

describe('session store: finished', () => {
  beforeEach(() => {
    useSessionStore.setState({ finished: false, items: [], index: 0 });
  });

  it('starts a session not finished', () => {
    useSessionStore.getState().init('net', course, 'quiz');
    expect(useSessionStore.getState().finished).toBe(false);
  });

  it('finish() marks the session complete', () => {
    useSessionStore.getState().init('net', course, 'quiz');
    useSessionStore.getState().finish();
    expect(useSessionStore.getState().finished).toBe(true);
  });

  it('init() clears a previous finish — this is what makes "Study again" work', () => {
    const s = useSessionStore.getState();
    s.init('net', course, 'quiz');
    s.finish();
    expect(useSessionStore.getState().finished).toBe(true);

    // Restarting must return to the first item with a clean slate. Before
    // `finished` moved into the store, CardSession had to reset it from an
    // effect; this test pins the behaviour that replaced it.
    useSessionStore.getState().init('net', course, 'quiz');
    const after = useSessionStore.getState();
    expect(after.finished).toBe(false);
    expect(after.index).toBe(0);
    expect(after.score).toEqual({ got: 0, missed: 0 });
  });

  it('advancing past the last item is what callers detect with next()', () => {
    const s = useSessionStore.getState();
    s.init('net', course, 'quiz');
    expect(useSessionStore.getState().next()).toBe(true); // 0 → 1
    expect(useSessionStore.getState().next()).toBe(false); // no item 2
    expect(useSessionStore.getState().finished).toBe(false); // next() alone doesn't finish
  });
});
