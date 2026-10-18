import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { parseCourse } from '@/schema/parseCourse';
import { classExams, lectureExam, lectureName, lecturesOf, withExamSections, writeClassExams, type ClassExamView } from './classExams';
import { examRule } from './exam';

const lecture = (title: string, metadata: Partial<Course['metadata']> = {}): Course =>
  ({
    schema_version: '1.0',
    metadata: { title, course_code: 'BIOC301', ...metadata },
    sections: [
      { id: 's1', title: 'One', items: [{ id: `${title}-q`, type: 'flashcard', front: 'f', back: 'b' }] },
      { id: 's2', title: 'Two', items: [] },
      { id: 's3', title: 'Three', items: [] },
    ],
  }) as unknown as Course;

const day = (iso: string) => new Date(`${iso}T12:00:00`).getTime();
const mid1 = { id: 'm1', name: 'Midterm 1', date: '2026-10-20' };
const fin = { id: 'f', name: 'Final', date: '2026-12-15' };

describe('lectureExam: the nearest upcoming exam that covers the lecture', () => {
  const l = lecture('I', { exams: [{ ...fin }, { ...mid1, sections: ['s1'] }] });

  it('follows the midterm while it is ahead', () => {
    expect(lectureExam(l, day('2026-10-11'))).toMatchObject({ name: 'Midterm 1', date: '2026-10-20', sections: ['s1'] });
  });

  it('moves on to the final once the midterm has passed, with nothing to do', () => {
    expect(lectureExam(l, day('2026-10-21'))).toMatchObject({ name: 'Final', date: '2026-12-15', sections: undefined });
    // And the scheduler sees it: the exam rule now runs to the final, on every section.
    const rule = examRule(l, {}, day('2026-10-21'));
    expect(rule.at).toBe(new Date(2026, 11, 15, 9).getTime());
    expect(rule.scope).toBeNull();
  });

  it('counts a lecture’s own exam the same way', () => {
    const own = lecture('II', { exam_date: '2026-10-15', exams: [fin] });
    expect(lectureExam(own, day('2026-10-11'))).toMatchObject({ date: '2026-10-15', source: { kind: 'own' } });
  });

  it('is nothing without an exam', () => {
    expect(lectureExam(lecture('III'), day('2026-10-11'))).toEqual({});
  });

  it('changes the sections where the exam lives', () => {
    const now = day('2026-10-11');
    expect(withExamSections(l, ['s1', 's2'], now).metadata.exams!.find((e) => e.id === 'm1')!.sections).toEqual(['s1', 's2']);
    const own = lecture('II', { exam_date: '2026-10-15' });
    expect(withExamSections(own, ['s3'], now).metadata.exam_sections).toEqual(['s3']);
  });
});

describe('a class’s exams', () => {
  const courses = {
    a: lecture('Lecture 2', { exams: [{ ...mid1, sections: ['s2'] }, fin] }),
    b: lecture('Lecture 1', { exams: [mid1, fin] }),
    c: lecture('Lecture 3', { exams: [fin] }),
    other: lecture('Elsewhere', { course_code: 'CHEM101', exams: [fin] }),
  };

  it('gathers them from the class’s lectures, next one first', () => {
    const list = classExams(lecturesOf(courses, 'BIOC301'), day('2026-10-11'));
    expect(list.map((e) => e.name)).toEqual(['Midterm 1', 'Final']);
    expect(list[0].covers).toEqual({ a: ['s2'], b: 'all' });
    expect(Object.keys(list[1].covers).sort()).toEqual(['a', 'b', 'c']);
  });

  it('puts the ones already sat last', () => {
    const list = classExams(lecturesOf(courses, 'BIOC301'), day('2026-11-01'));
    expect(list.map((e) => e.name)).toEqual(['Final', 'Midterm 1']);
  });

  it('keeps an exam set on one lecture before, as "Exam"', () => {
    const list = classExams([['x', lecture('X', { exam_date: '2026-11-02', exam_sections: ['s1'] })]], day('2026-10-11'));
    expect(list).toEqual([{ id: 'own-2026-11-02', name: 'Exam', date: '2026-11-02', covers: { x: ['s1'] } }]);
  });

  it('writes each lecture the exams that cover it, with its own sections, and drops its single exam', () => {
    const lectures: [string, Course][] = [
      ['x', lecture('X', { exam_date: '2026-11-02' })],
      ['y', lecture('Y')],
    ];
    const exams: ClassExamView[] = [
      { id: 'm1', name: 'Midterm 1', date: '2026-10-20', covers: { x: ['s3', 's1'] } },
      { id: 'f', name: 'Final', date: '2026-12-15', covers: { x: 'all', y: ['s1', 's2', 's3'] } },
    ];
    const out = writeClassExams(lectures, exams);
    expect(out.x.metadata.exams).toEqual([
      { id: 'm1', name: 'Midterm 1', date: '2026-10-20', sections: ['s1', 's3'] },
      { id: 'f', name: 'Final', date: '2026-12-15' },
    ]);
    expect(out.x.metadata.exam_date).toBeUndefined();
    // Every section ticked is stored as "all", so a section added later joins.
    expect(out.y.metadata.exams).toEqual([{ id: 'f', name: 'Final', date: '2026-12-15' }]);
  });

  it('leaves a lecture no exam covers with none, and does not touch one that did not change', () => {
    const lectures: [string, Course][] = [['x', lecture('X', { exams: [fin] })], ['y', lecture('Y', { exams: [fin] })]];
    const out = writeClassExams(lectures, [{ ...fin, covers: { y: 'all' } }]);
    expect(Object.keys(out)).toEqual(['x']);
    expect(out.x.metadata.exams).toBeUndefined();
  });
});

describe('the exam list from someone else’s file', () => {
  const file = (exams: unknown) =>
    ({ schema_version: '1.0', metadata: { title: 'T', exams }, sections: [{ id: 's', title: 'S', items: [] }] });

  it('keeps a well-formed list', () => {
    const r = parseCourse(file([{ id: 'f', name: 'Final', date: '2026-12-15', sections: ['s'] }]));
    expect(r.ok && r.course.metadata.exams).toEqual([{ id: 'f', name: 'Final', date: '2026-12-15', sections: ['s'] }]);
  });

  it('drops a malformed list rather than refusing the lecture', () => {
    for (const bad of [[{ id: 'f', name: 'Final', date: 'next Tuesday' }], [{ id: 'f', name: 'x'.repeat(500), date: '2026-12-15' }], 'Final']) {
      const r = parseCourse(file(bad));
      expect(r.ok).toBe(true);
      expect(r.ok && r.course.metadata.exams).toBeUndefined();
    }
  });

  it('keeps the good exams when one is bad, and at most twenty', () => {
    const r = parseCourse(file([{ id: 'x', name: 'Bad', date: 'soon' }, { id: 'f', name: 'Final', date: '2026-12-15' }]));
    expect(r.ok && r.course.metadata.exams).toEqual([{ id: 'f', name: 'Final', date: '2026-12-15' }]);
    const many = parseCourse(file(Array.from({ length: 50 }, (_, k) => ({ id: `e${k}`, name: 'E', date: '2026-12-15' }))));
    expect(many.ok && many.course.metadata.exams).toHaveLength(20);
  });
});

describe('an exam list that did not come through the file check', () => {
  it('skips bad entries instead of breaking', () => {
    const l = lecture('X', { exams: [{ id: 'f', name: 'Final', date: '2026-12-15' }, { id: 3, date: null }] as never });
    expect(lectureExam(l, day('2026-10-11'))).toMatchObject({ name: 'Final' });
    expect(lectureExam(lecture('Y', { exams: 'nonsense' as never }), day('2026-10-11'))).toEqual({});
  });
});

describe('the exam list goes wherever the lecture goes', () => {
  const withExams = lecture('X', { exams: [mid1, { ...fin, sections: ['s1'] }] });

  it('survives a backup and restore', async () => {
    const { makeBackup, readBackup, restoreBackup } = await import('./backup');
    const { useCoursesStore } = await import('@/store/courses');
    useCoursesStore.setState({ courses: { x: withExams } });
    const read = readBackup(JSON.stringify(makeBackup()));
    if (!read.ok) throw new Error(read.error);
    localStorage.clear();
    restoreBackup(read.backup);
    const { packedCourseStorage } = await import('./packedStorage');
    const value = packedCourseStorage<{ courses: Record<string, Course> }>().getItem('arborous:courses') as { state: { courses: Record<string, Course> } };
    const stored = value.state.courses.x;
    expect(stored.metadata.exams).toEqual(withExams.metadata.exams);
  });

  it('syncs with the side that changed it last', async () => {
    const { mergeSnapshots, EMPTY_SNAPSHOT } = await import('./syncMerge');
    const older = lecture('X');
    const merged = mergeSnapshots(
      { ...EMPTY_SNAPSHOT, courses: { x: older }, editedAt: { x: 1 } },
      { ...EMPTY_SNAPSHOT, courses: { x: withExams }, editedAt: { x: 2 } },
    );
    expect(merged.courses.x.metadata.exams).toEqual(withExams.metadata.exams);
  });

  it('travels in a share link, which is checked like an uploaded file', () => {
    const r = parseCourse(JSON.parse(JSON.stringify(withExams)));
    expect(r.ok && r.course.metadata.exams).toEqual(withExams.metadata.exams);
  });
});

describe('lectureName', () => {
  it('drops the class code a title opens with', () => {
    expect(lectureName('BIOL 365: Cell signalling', 'BIOL 365')).toBe('Cell signalling');
    expect(lectureName('BIOL 365 – Enzymes', 'biol 365')).toBe('Enzymes');
  });
  it('keeps a title that does not open with it, or is only the code', () => {
    expect(lectureName('Enzymes', 'BIOL 365')).toBe('Enzymes');
    expect(lectureName('BIOL 365', 'BIOL 365')).toBe('BIOL 365');
    expect(lectureName('BIOL 3650 notes', 'BIOL 365')).toBe('BIOL 3650 notes');
    expect(lectureName('Enzymes', null)).toBe('Enzymes');
  });
});
