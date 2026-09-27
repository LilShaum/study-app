import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { measuredPace, useStudyLogStore } from './studyLog';
import { useSessionStore } from './session';
import { useProgressStore } from './progress';

const mcq = (id: string) =>
  ({ id, type: 'mcq', question: `${id}?`, options: ['a', 'b', 'c', 'd'], correct_index: 0, explanation: 'x' }) as StudyItem;
const course = { schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's', title: 'S', items: [mcq('q1'), mcq('q2')] }] } as Course;

describe('study log', () => {
  beforeEach(() => {
    useStudyLogStore.setState({ byCourse: {} });
    useProgressStore.setState({ byCourse: {} });
  });
  afterEach(() => vi.useRealTimers());

  it('keeps built-in guesses until a type has enough samples', () => {
    const times = Array.from({ length: 14 }, () => ({ type: 'mcq', seconds: 50 }));
    expect(measuredPace({ c: { times, answers: [], days: {} } })).toEqual({});
    expect(measuredPace({ c: { times: [...times, { type: 'mcq', seconds: 50 }], answers: [], days: {} } })).toEqual({ mcq: 50 });
  });

  it('logs each answer, and each card as the student moves on', () => {
    const s = useSessionStore.getState;
    // A card is timed from when it is shown; opened and left in the same
    // millisecond it would log zero seconds, which the log drops.
    vi.useFakeTimers({ now: 1_000_000 });
    s().init('c', course, 'quiz');
    vi.setSystemTime(1_008_000);
    s().record(false);
    s().next();
    const log = useStudyLogStore.getState().byCourse.c;
    expect(log.answers).toHaveLength(1);
    expect(log.answers[0]).toMatchObject({ type: 'mcq', got: false, sinceHours: null, afterMiss: false });
    expect(log.times.map((t) => t.type)).toEqual(['mcq']);
  });

  it('marks an answer that follows a miss', () => {
    const s = useSessionStore.getState;
    useProgressStore.getState().recordResult('c', 'q1', false);
    s().init('c', course, 'quiz');
    s().record(true);
    expect(useStudyLogStore.getState().byCourse.c.answers[0].afterMiss).toBe(true);
  });
});

describe('study log — size', () => {
  beforeEach(() => useStudyLogStore.setState({ byCourse: {} }));

  it('skips cards flicked past in under a second', () => {
    useStudyLogStore.getState().logCard('c', 'mcq', 0.4, 0);
    expect(useStudyLogStore.getState().byCourse.c).toBeUndefined();
  });

  it('stores answers rounded, not as full-precision doubles', () => {
    useStudyLogStore.getState().logAnswer('c', { at: 1, type: 'mcq', got: true, sinceHours: 12.345678901, afterMiss: false, predicted: 0.8123456789 });
    expect(useStudyLogStore.getState().byCourse.c.answers[0]).toMatchObject({ sinceHours: 12.35, predicted: 0.812 });
  });

  it('never measures a pace below a floor', () => {
    const times = Array.from({ length: 20 }, () => ({ type: 'flashcard', seconds: 1 }));
    expect(measuredPace({ c: { times, answers: [], days: {} } }).flashcard).toBe(3);
  });
});
