import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { planReminders, type PlanInput } from './reminderPlan';

const DAY = 86_400_000;
const HOUR = 3_600_000;
// A Wednesday morning, local time.
const now = new Date(2026, 9, 7, 9).getTime();

function lecture(title: string, cards: number, meta: Record<string, unknown> = {}): Course {
  return {
    schema_version: '1.0',
    metadata: { title, ...meta },
    sections: [
      {
        id: 's',
        title: 'S',
        order: 1,
        items: Array.from({ length: cards }, (_, i) => ({ id: `${title}${i}`, type: 'flashcard', front: `f${i}`, back: 'b' })),
      },
    ],
  } as unknown as Course;
}

const strong = (): ItemResult => ({ got: 1, missed: 0, lastSeen: now, stability: 60 }) as unknown as ItemResult;

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    courses: {},
    progress: {},
    now,
    settings: { daily: true, time: '18:00', secondLook: true, exam: true },
    minutesFor: () => 30,
    studiedTodaySeconds: 0,
    ...over,
  };
}

describe('planReminders', () => {
  it('reminds each day at the chosen time while there is something new', () => {
    const plan = planReminders(input({ courses: { a: lecture('Cells', 3, { course_code: 'BIO 101' }) } }));
    expect(plan).toHaveLength(7);
    expect(plan.every((r) => r.kind === 'daily' && new Date(r.sendAt).getHours() === 18)).toBe(true);
    expect(plan[0]!.body).toBe('New material in BIO 101. About 30 minutes.');
    expect(plan[0]!.url).toBe('#/');
  });

  it('says nothing on a day with nothing to study', () => {
    const c = lecture('Cells', 2);
    const progress = { a: { Cells0: strong(), Cells1: strong() } };
    expect(planReminders(input({ courses: { a: c }, progress }))).toEqual([]);
  });

  it('drops today’s reminder once the day’s time is studied, and keeps tomorrow’s', () => {
    const plan = planReminders(input({ courses: { a: lecture('Cells', 3) }, studiedTodaySeconds: 30 * 60 }));
    expect(plan[0]!.sendAt).toBeGreaterThan(now + DAY - 12 * HOUR);
    expect(plan).toHaveLength(6);
  });

  it('turns the day three days and one day before an exam into the exam’s reminder', () => {
    const exam = new Date(now + 4 * DAY);
    const date = `${exam.getFullYear()}-${String(exam.getMonth() + 1).padStart(2, '0')}-${String(exam.getDate()).padStart(2, '0')}`;
    const plan = planReminders(input({ courses: { a: lecture('Cells', 3, { course_code: 'BIO 101', exam_date: date }) } }));
    const exams = plan.filter((r) => r.kind === 'exam');
    expect(exams.map((r) => r.title)).toEqual(['BIO 101 exam in 3 days', 'BIO 101 exam tomorrow']);
    expect(exams[0]!.body).toBe('New material in BIO 101. About 30 minutes.');
    expect(exams[0]!.url).toBe('#/class/BIO%20101');
  });

  it('plans one second look a few hours after a sitting with misses, unless it falls at night', () => {
    const c = lecture('Cells', 2);
    const missed = { got: 0, missed: 1, lastSeen: now - HOUR, lastGot: false, stability: 1 } as unknown as ItemResult;
    const plan = planReminders(
      input({
        courses: { a: c },
        progress: { a: { Cells0: missed, Cells1: strong() } },
        settings: { daily: false, time: '18:00', secondLook: true, exam: false },
      }),
    );
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ kind: 'second-look', sendAt: now + 2 * HOUR, url: '#/study/a' });
    expect(plan[0]!.body).toBe('The one you missed in Cells is worth another try now.');

    const late = new Date(2026, 9, 7, 21).getTime();
    const lateMiss = { ...missed, lastSeen: late - HOUR };
    expect(
      planReminders(
        input({
          now: late,
          courses: { a: c },
          progress: { a: { Cells0: lateMiss } },
          settings: { daily: false, time: '18:00', secondLook: true, exam: false },
        }),
      ),
    ).toEqual([]);
  });

  it('sends nothing for a kind that is switched off', () => {
    const plan = planReminders(
      input({ courses: { a: lecture('Cells', 3) }, settings: { daily: false, time: '18:00', secondLook: false, exam: false } }),
    );
    expect(plan).toEqual([]);
  });
});
