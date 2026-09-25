import { describe, it, expect, beforeEach } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { useSessionStore } from './session';
import { useProgressStore } from './progress';

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

describe('session store: overriding a verdict', () => {
  beforeEach(() => {
    useProgressStore.setState({ byCourse: {} });
    useSessionStore.getState().init('ov', course, 'quiz');
  });

  const stored = () => useProgressStore.getState().byCourse.ov?.q1;

  it('corrects the recorded attempt instead of adding a second one', () => {
    const s = useSessionStore.getState();
    s.record(false);
    s.setResult(true);
    expect(useSessionStore.getState().score).toEqual({ got: 1, missed: 0 });
    expect(stored()).toMatchObject({ got: 1, missed: 0 });
  });

  it('can be flipped back, and repeating the same call changes nothing', () => {
    const s = useSessionStore.getState();
    s.record(true);
    s.setResult(false);
    s.setResult(false);
    s.setResult(true);
    expect(useSessionStore.getState().score).toEqual({ got: 1, missed: 0 });
    expect(stored()).toMatchObject({ got: 1, missed: 0 });
  });

  it('keeps the history from earlier sessions', () => {
    useProgressStore.setState({ byCourse: { ov: { q1: { got: 4, missed: 0, lastSeen: 1 } } } });
    const s = useSessionStore.getState();
    s.record(false);
    s.setResult(true);
    expect(stored()).toMatchObject({ got: 5, missed: 0 });
  });

  it('records normally when nothing was recorded yet', () => {
    useSessionStore.getState().setResult(true);
    expect(useSessionStore.getState().score).toEqual({ got: 1, missed: 0 });
    expect(stored()).toMatchObject({ got: 1, missed: 0 });
  });
});

describe('session store: an override and the memory model', () => {
  beforeEach(() => {
    useProgressStore.setState({ byCourse: {} });
    useSessionStore.getState().init('mm', course, 'quiz');
  });

  it('leaves the same stability as answering right in the first place', () => {
    const s = useSessionStore.getState();
    s.record(false);
    s.setResult(true);
    const overruled = useProgressStore.getState().byCourse.mm.q1.stability;
    useProgressStore.setState({ byCourse: {} });
    useSessionStore.getState().init('mm', course, 'quiz');
    useSessionStore.getState().record(true);
    expect(overruled).toBe(useProgressStore.getState().byCourse.mm.q1.stability);
  });
});

describe('session store: retrying what was missed', () => {
  beforeEach(() => {
    useProgressStore.setState({ byCourse: {} });
    useSessionStore.getState().init('rt', course, 'quiz');
  });

  it('runs again over only the missed items, from a clean score', () => {
    const s = useSessionStore.getState();
    s.record(true);
    s.next();
    useSessionStore.getState().record(false);
    useSessionStore.getState().finish();
    useSessionStore.getState().retryMissed();
    const after = useSessionStore.getState();
    expect(after.items.map((i) => i.id)).toEqual(['q2']);
    expect(after).toMatchObject({ index: 0, finished: false, score: { got: 0, missed: 0 } });
  });

  it('does nothing when nothing was missed', () => {
    useSessionStore.getState().record(true);
    useSessionStore.getState().finish();
    useSessionStore.getState().retryMissed();
    expect(useSessionStore.getState().finished).toBe(true);
  });
});

describe('progress store: remembering a mix-up', () => {
  beforeEach(() => useProgressStore.setState({ byCourse: {} }));

  it('keeps the latest three, newest first, without repeats', () => {
    const s = useProgressStore.getState();
    s.recordResult('c', 'a~recall', false);
    for (const other of ['b', 'c', 'b', 'd', 'e']) useProgressStore.getState().noteConfusion('c', 'a~recall', other);
    expect(useProgressStore.getState().byCourse.c['a~recall'].confusedWith).toEqual(['e', 'd', 'b']);
  });

  it('has nothing to attach to before an answer is recorded', () => {
    useProgressStore.getState().noteConfusion('c', 'never', 'b');
    expect(useProgressStore.getState().byCourse.c).toBeUndefined();
  });
});
