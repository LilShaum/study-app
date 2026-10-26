import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  it('never puts back a written answer of several points: Review brings it back', () => {
    const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
    const written = {
      schema_version: '1.0',
      metadata: { title: 'W' },
      sections: [
        {
          id: 's1',
          title: 'One',
          items: [
            ...names.map((t, n) => ({ id: `d${n}`, type: 'definition', term: t, definition: `meaning ${n}` })),
            mcq('q1', 'Which is Alpha?'),
            { id: 'w', type: 'flashcard', front: 'How do Alpha and Theta differ?', back: '(1) Alpha is first. (2) Theta is last.' },
          ],
        },
      ],
    } as unknown as Course;
    s().init('w-c', written, 'learn');
    goTo('w');
    const before = s().items.length;
    s().record(false);
    expect(s().items).toHaveLength(before);
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

  /** One long step of questions, to see a card come back more than once. */
  const longStep = () => {
    const items = s().items.filter((i) => i.type === 'mcq');
    const many = Array.from({ length: 5 }, (_, k) => items.map((i) => ({ ...i, id: `${i.id}-${k}`, _block: 's1#0' }))).flat();
    useSessionStore.setState({ items: many, index: 0 });
  };

  it('gives up after three returns and leaves it to Review', () => {
    longStep();
    const id = s().current()!.id;
    for (let n = 0; n < 4; n++) {
      s().record(false);
      if (n < 3) onTo(id);
    }
    expect(s().items.filter((i) => i.id === id)).toHaveLength(4);
    expect(s().stillMissed()).toEqual([id]);
  });

  it('keeps a miss in its own step: as its last card when the step ends sooner', () => {
    goTo('q3');
    const block = s().current()!._block;
    s().record(false);
    const copy = s().items.findIndex((i, n) => n > s().index && i.id === 'q3');
    expect(s().items[copy]).toMatchObject({ _again: 1, _block: block });
    expect(s().items[copy + 1]?._block).not.toBe(block);
    expect(s().items[copy - 1].id).not.toBe('q3');
  });

  it('never brings a miss back straight after itself', () => {
    goTo('q4');
    const before = s().items.length;
    // The step's last card: nothing to put between it and itself.
    s().record(false);
    expect(s().items).toHaveLength(before);
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

describe('session store: kind filter', () => {
  const mixed = {
    schema_version: '1.0',
    metadata: { title: 'Net' },
    sections: [
      {
        id: 's1',
        title: 'One',
        items: [mcq('q1', 'A?'), { id: 'f1', type: 'flashcard', front: 'f', back: 'b' } as StudyItem],
      },
    ],
  } as Course;

  beforeEach(() => {
    useSessionStore.setState({ pendingKind: null });
  });

  it('init keeps only the pending kind in weakest mode', () => {
    useSessionStore.getState().setPendingKind('flashcards');
    useSessionStore.getState().init('net', mixed, 'weakest');
    expect(useSessionStore.getState().items.map((i) => i.id)).toEqual(['f1']);
  });

  it('serves every kind with none pending, and keeps the filter across a restart', () => {
    useSessionStore.getState().init('net', mixed, 'weakest');
    expect(useSessionStore.getState().items).toHaveLength(2);
    useSessionStore.getState().setPendingKind('questions');
    useSessionStore.getState().init('net', mixed, 'weakest');
    useSessionStore.getState().init('net', mixed, 'weakest');
    expect(useSessionStore.getState().items.map((i) => i.id)).toEqual(['q1']);
  });
});

describe('session store: Learn after reading the slides', () => {
  const course = {
    schema_version: '1.0',
    metadata: { title: 'S' },
    sections: [
      {
        id: 's1',
        title: 'One',
        source_range: 'slides 1–4',
        items: [
          { id: 'd0', type: 'definition', term: 'Alpha', definition: 'meaning 0' },
          { id: 'f0', type: 'flashcard', front: 'Front about Alpha', back: 'Back' },
          mcq('q0', 'Which is Alpha?'),
        ],
      },
    ],
  } as unknown as Course;
  const s = () => useSessionStore.getState();

  beforeEach(() => {
    useProgressStore.setState({ byCourse: {} });
    s().init('slides', course, 'learn');
  });

  it('drops the reading cards ahead, so every card is asked first, and moves on', () => {
    expect(s().current()?.type).toBe('slides');
    s().askFirst('s1');
    const types = s().items.slice(s().index).map((i) => i.type);
    expect(types).not.toContain('definition');
    expect(types).not.toContain('preview');
    expect(types).toEqual(expect.arrayContaining(['recall', 'flashcard', 'mcq']));
    expect(s().current()?.type).not.toBe('slides');
  });
});

describe('session store: a card set aside leaves the sitting', () => {
  it('drops it and its copies still ahead', () => {
    const c = {
      schema_version: '1.0',
      metadata: { title: 'D' },
      sections: [{ id: 's1', title: 'One', items: [mcq('q1', 'A?'), mcq('q2', 'B?'), mcq('q3', 'C?')] }],
    } as Course;
    const s = () => useSessionStore.getState();
    useProgressStore.setState({ byCourse: {} });
    s().init('drop', c, 'quiz');
    const first = s().current()!.id;
    s().dropAhead('q3');
    expect(s().items.map((i) => i.id)).not.toContain('q3');
    expect(s().current()!.id).toBe(first);
  });
});

describe('session store: one term in two lectures', () => {
  const lecture = (id: string, definition: string) =>
    ({
      schema_version: '1.0',
      metadata: { title: id },
      sections: [{ id: 's', title: 'S', items: [{ id: `${id}-eff`, type: 'definition', term: 'Stoma', definition }] }],
    }) as Course;
  const a = lecture('a', 'A pore in the leaf surface, opened and closed by guard cells, through which gases pass.');
  const b = lecture('b', 'A pore in the surface of a leaf through which gases pass, opened by guard cells.');

  it('counts a typed term for the same term in the other lecture, and adopts an earlier record', async () => {
    const { useCoursesStore } = await import('./courses');
    useCoursesStore.setState({ courses: { a, b } });
    useProgressStore.setState({ byCourse: {} });
    useSessionStore.getState().init('a', a, 'definitions');
    useSessionStore.getState().record(true);
    expect(useProgressStore.getState().byCourse.b?.['b-eff~recall']?.got).toBe(1);

    // A record made before the link existed is taken up when the other lecture opens.
    useProgressStore.setState({ byCourse: { a: { 'a-eff~recall': { got: 2, missed: 0, lastSeen: 5 } } } });
    useSessionStore.getState().init('b', b, 'definitions');
    expect(useProgressStore.getState().byCourse.b?.['b-eff~recall']?.got).toBe(2);
  });
});

describe('session store: a class practised with its lectures mixed', () => {
  // Two made-up lectures that share an item id, as two generated lectures can.
  const lecture = (title: string, ids: string[]) =>
    ({
      schema_version: '1.0',
      metadata: { title, course_code: 'MIX 1' },
      sections: [{ id: 's1', title: 'One', items: ids.map((id) => mcq(id, `${title} ${id}?`)) }],
    }) as Course;
  const A = lecture('MIX 1: Alpha', ['q1', 'a2', 'a3']);
  const B = lecture('MIX 1: Beta', ['q1', 'b2']);
  const s = () => useSessionStore.getState();
  const start = async () => {
    const { useCoursesStore } = await import('./courses');
    useCoursesStore.setState({ courses: { A, B } });
    useProgressStore.setState({ byCourse: {} });
    const { useStudyLogStore } = await import('./studyLog');
    useStudyLogStore.setState({ byCourse: {} });
    s().setPendingKind(null);
    s().setPendingStudy(null);
    s().initMixed('A', [['A', A], ['B', B]], 'quiz');
  };
  /** Move to a card by its lecture and id. */
  const goTo = (courseId: string, id: string) => {
    const at = s().items.findIndex((i) => i._courseId === courseId && i.id === id);
    useSessionStore.setState({ index: at });
  };

  afterEach(() => vi.restoreAllMocks());

  it('holds every card of both lectures, each with its own lecture', async () => {
    await start();
    expect(s().items).toHaveLength(5);
    expect(s().items.filter((i) => i.id === 'q1').map((i) => i._courseId).sort()).toEqual(['A', 'B']);
    expect(s().lectures).toEqual(['A', 'B']);
    expect(Object.keys(s().startByCourse).sort()).toEqual(['A', 'B']);
  });

  it("records each answer, and the card's time, in the card's own lecture", async () => {
    const { useStudyLogStore } = await import('./studyLog');
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    await start();
    goTo('B', 'q1');
    s().record(true);
    expect(useProgressStore.getState().byCourse.B?.q1?.got).toBe(1);
    expect(useProgressStore.getState().byCourse.A?.q1).toBeUndefined();
    expect(useStudyLogStore.getState().byCourse.B?.answers).toHaveLength(1);
    expect(useStudyLogStore.getState().byCourse.A?.answers ?? []).toHaveLength(0);
    // Leaving the card after 8 seconds logs them in its lecture.
    now += 8000;
    if (s().hasNext()) s().next();
    else s().prev();
    expect(useStudyLogStore.getState().byCourse.B?.times).toEqual([{ type: 'mcq', seconds: 8 }]);
    expect(useStudyLogStore.getState().byCourse.A?.times ?? []).toHaveLength(0);
  });

  it("corrects an overruled verdict in the card's own lecture", async () => {
    await start();
    goTo('B', 'q1');
    s().record(false);
    s().setResult(true);
    expect(useProgressStore.getState().byCourse.B?.q1).toMatchObject({ got: 1, missed: 0 });
    expect(useProgressStore.getState().byCourse.A?.q1).toBeUndefined();
  });

  it('tells apart two missed cards that share an id, and retries both', async () => {
    await start();
    goTo('A', 'q1');
    s().record(false);
    goTo('B', 'q1');
    s().record(false);
    expect(s().stillMissed()).toHaveLength(2);
    s().retryMissed();
    expect(s().items.map((i) => `${i._courseId}:${i.id}`).sort()).toEqual(['A:q1', 'B:q1']);
  });

  it("sets aside only that lecture's copy of a shared id", async () => {
    await start();
    // On a card before both copies of q1, so both are still ahead.
    const firstQ1 = s().items.findIndex((i) => i.id === 'q1');
    useSessionStore.setState({ index: firstQ1 - 1 });
    if (firstQ1 === 0) {
      // Mixed so that a q1 comes first: put it on screen and drop the other lecture's.
      const onScreen = s().items[0]._courseId!;
      const other = onScreen === 'A' ? 'B' : 'A';
      useSessionStore.setState({ index: 0 });
      s().dropAhead('q1', other);
      expect(s().items.filter((i) => i.id === 'q1').map((i) => i._courseId)).toEqual([onScreen]);
      return;
    }
    s().dropAhead('q1', 'B');
    expect(s().items.filter((i) => i.id === 'q1').map((i) => i._courseId)).toEqual(['A']);
  });

  it('picks a bookmark up at its card, found by lecture and id', async () => {
    await start();
    s().initMixed('B', [['A', A], ['B', B]], 'quiz', { courseId: 'B', itemId: 'q1' });
    expect(s().resumed).toBe(true);
    expect(s().current()).toMatchObject({ id: 'q1', _courseId: 'B' });
  });

  it('leaves a session of one lecture as it was: no lectures, no marks on its cards', async () => {
    await start();
    s().init('A', A, 'quiz');
    expect(s().lectures).toBeNull();
    expect(s().items.every((i) => i._courseId === undefined)).toBe(true);
    expect(Object.keys(s().startByCourse)).toEqual(['A']);
  });

  it('runs Learn and Today as one lecture, whatever it is asked', async () => {
    await start();
    s().initMixed('A', [['A', A], ['B', B]], 'today');
    expect(s().lectures).toBeNull();
    expect(s().items.every((i) => i._courseId === undefined)).toBe(true);
  });
});
