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

describe('agedProgress (testing tool)', () => {
  it('moves every answer time back and changes nothing else', async () => {
    const { agedProgress } = await import('./progress');
    const DAY = 86_400_000;
    const r = { got: 2, missed: 1, lastSeen: 10 * DAY, stability: 3, before: { stability: 1, lastSeen: 8 * DAY } };
    expect(agedProgress({ a: r }, 7).a).toEqual({ ...r, lastSeen: 3 * DAY, before: { stability: 1, lastSeen: 1 * DAY } });
  });
});

describe('session store: Learn brings a missed card back', () => {
  const terms = ['Alpha', 'Beta', 'Gamma', 'Delta'];
  const learnCourse = {
    schema_version: '1.0',
    metadata: { title: 'L' },
    sections: [
      {
        id: 's1',
        title: 'One',
        items: [
          ...terms.map((t, n) => ({ id: `d${n}`, type: 'definition', term: t, definition: `meaning ${n}` })),
          mcq('q1', 'Which is Alpha?'),
          mcq('q2', 'Which is Beta?'),
          mcq('q3', 'Which is Gamma?'),
          mcq('q4', 'Which is Delta?'),
          mcq('q5', 'Which is Alpha again?'),
        ],
      },
    ],
  } as unknown as Course;

  const s = () => useSessionStore.getState();
  const goTo = (id: string) => {
    while (s().current()?.id !== id) if (!s().next()) throw new Error(`${id} not reached`);
  };
  /** On to the next card with this id, past the one showing now. */
  const onTo = (id: string) => {
    s().next();
    goTo(id);
  };

  beforeEach(() => {
    useProgressStore.setState({ byCourse: {} });
    s().init('learn-c', learnCourse, 'learn');
  });

  it('puts it back a few cards on, until it is right once', () => {
    goTo('q1');
    const at = s().index;
    const before = s().items.length;
    s().record(false);
    expect(s().items).toHaveLength(before + 1);
    expect(s().items[at + 4]).toMatchObject({ id: 'q1', _again: 1 });
    s().next(); s().next(); s().next(); s().next();
    expect(s().current()?.id).toBe('q1');
    s().record(true);
    expect(s().items).toHaveLength(before + 1);
  });

  it('counts the first attempt only, and a miss put right is not still missed', () => {
    goTo('q1');
    s().record(false);
    onTo('q1');
    s().record(true);
    expect(s().score).toEqual({ got: 0, missed: 1 });
    expect(s().stillMissed()).toEqual([]);
  });

  it('gives up after three returns and leaves it to Review', () => {
    goTo('q1');
    for (let n = 0; n < 4; n++) {
      s().record(false);
      if (n < 3) onTo('q1');
    }
    expect(s().items.filter((i) => i.id === 'q1')).toHaveLength(4);
    expect(s().stillMissed()).toEqual(['q1']);
  });

  it('takes the copy back when the miss is overruled', () => {
    goTo('q1');
    const before = s().items.length;
    s().record(false);
    s().setResult(true);
    expect(s().items).toHaveLength(before);
  });

  it('does not do this outside Learn', () => {
    s().init('learn-c', learnCourse, 'quiz');
    const before = s().items.length;
    s().record(false);
    expect(s().items).toHaveLength(before);
  });
});

describe('session store: answers stay with their cards as copies come and go', () => {
  const learnCourse = {
    schema_version: '1.0',
    metadata: { title: 'L' },
    sections: [
      {
        id: 's1',
        title: 'One',
        items: [
          ...['Alpha', 'Beta', 'Gamma', 'Delta'].map((t, n) => ({ id: `d${n}`, type: 'definition', term: t, definition: `meaning ${n}` })),
          ...[1, 2, 3, 4, 5, 6].map((n) => mcq(`q${n}`, `Which is question ${n}?`)),
        ],
      },
    ],
  } as unknown as Course;
  const s = () => useSessionStore.getState();
  const goTo = (id: string) => {
    while (s().current()?.id !== id) if (!s().next()) throw new Error(`${id} not reached`);
  };
  /** Every recorded answer, by the id of the card it now sits under. */
  const recorded = () => [...s().results].map(([n, got]) => [s().items[n].id, s().items[n]._again ?? 0, got]);

  beforeEach(() => {
    useProgressStore.setState({ byCourse: {} });
    s().init('shift', learnCourse, 'learn');
  });

  it('after a miss, two more answers, and an earlier answer overruled into a miss', () => {
    goTo('q1');
    s().record(false); // q1 comes back 4 on
    s().next();
    s().record(true); // q2
    s().next();
    s().record(true); // q3
    s().prev(); // back to q2
    s().setResult(false); // now a miss: its copy goes in 4 on from q2, after q1's
    expect(recorded()).toEqual([
      ['q1', 0, false],
      ['q2', 0, false],
      ['q3', 0, true],
    ]);
    expect(s().items.filter((i) => i._again).map((i) => i.id)).toEqual(['q1', 'q2']);
    const copyOf = (id: string) => {
      while (!(s().current()?.id === id && s().current()?._again)) if (!s().next()) throw new Error(`${id} copy not reached`);
    };
    copyOf('q1');
    s().record(true);
    copyOf('q2');
    s().record(true);
    expect(s().stillMissed()).toEqual([]);
    expect(s().score).toEqual({ got: 1, missed: 2 });
  });

  it('taking a copy back after answers were recorded beyond it', () => {
    goTo('q1');
    s().record(false);
    const copyAt = s().items.findIndex((i) => i.id === 'q1' && i._again);
    // Skip past the copy without answering it, answer the card after it.
    while (s().index < copyAt + 1) s().next();
    s().record(true);
    const after = s().current()!.id;
    // Back to the ORIGINAL (not the copy, which has the same id) and overrule
    // the miss: the copy goes, and the answer recorded beyond it must still
    // belong to the same card.
    while (!(s().current()?.id === 'q1' && !s().current()?._again)) s().prev();
    s().setResult(true);
    expect(s().items.filter((i) => i._again)).toEqual([]);
    expect(recorded()).toEqual([
      ['q1', 0, true],
      [after, 0, true],
    ]);
  });
});
