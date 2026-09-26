import { beforeEach, describe, expect, it } from 'vitest';
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

  it('keeps built-in guesses until a type has enough samples', () => {
    const times = Array.from({ length: 14 }, () => ({ type: 'mcq', seconds: 50 }));
    expect(measuredPace({ c: { times, answers: [], days: {} } })).toEqual({});
    expect(measuredPace({ c: { times: [...times, { type: 'mcq', seconds: 50 }], answers: [], days: {} } })).toEqual({ mcq: 50 });
  });

  it('logs each answer, and each card as the student moves on', () => {
    const s = useSessionStore.getState;
    s().init('c', course, 'quiz');
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
