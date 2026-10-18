import { CourseTree } from '@/components/CourseTree';
import { lectureName } from '@/lib/classExams';
import { roman } from '@/lib/roman';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { useSessionStore } from '@/store/session';

/**
 * The end of a class's mixed Practice, lecture by lecture: each one's tree
 * with what the sitting grew on it, and how its cards went. Set as the class
 * page lists its lectures (numbered in class order, tree, name, figures);
 * one large tree would have shown only the lecture the sitting was opened
 * from.
 */
export function MixedLectures({ classCode }: { classCode: string }) {
  const lectures = useSessionStore((s) => s.lectures);
  const items = useSessionStore((s) => s.items);
  const results = useSessionStore((s) => s.results);
  const startByCourse = useSessionStore((s) => s.startByCourse);
  const courses = useCoursesStore((s) => s.courses);
  const byCourse = useProgressStore((s) => s.byCourse);

  // First tries only, as the sitting's own count is.
  const tally = new Map<string, { got: number; missed: number }>();
  for (const [i, got] of results) {
    const item = items[i];
    if (!item?._courseId || item._again) continue;
    const t = tally.get(item._courseId) ?? { got: 0, missed: 0 };
    tally.set(item._courseId, got ? { ...t, got: t.got + 1 } : { ...t, missed: t.missed + 1 });
  }
  const shown = (lectures ?? []).filter((id) => courses[id] && items.some((i) => i._courseId === id));
  if (!shown.length) return null;

  return (
    <ul className="mt-6 w-full border-t border-border text-left" aria-label="Lectures in this sitting">
      {shown.map((id) => {
        const course = courses[id];
        const t = tally.get(id);
        return (
          <li key={id} className="border-b border-border">
            <div className="entry py-3 pr-2">
              <span className="entry-num mark text-right text-text-3">{roman((lectures ?? []).indexOf(id) + 1)}</span>
              <CourseTree
                courseId={id}
                course={course}
                progress={byCourse[id] ?? EMPTY_PROGRESS}
                grewFrom={startByCourse[id]}
                className="entry-art h-10 w-10 sm:h-12 sm:w-12"
              />
              <span className="entry-body min-w-0 font-display text-body font-semibold leading-snug text-text">
                {lectureName(course.metadata.title, classCode)}
              </span>
              <span className="entry-figs tabular-nums">
                {t ? (
                  <span className="mark block whitespace-nowrap">
                    <span className="text-success">{t.got} right</span>
                    <span className="text-text-3"> · </span>
                    <span className="text-error">{t.missed} missed</span>
                  </span>
                ) : (
                  <span className="mark block text-text-3">None answered</span>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
