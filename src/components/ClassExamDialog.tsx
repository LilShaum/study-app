import { useState, type FormEvent } from 'react';
import { useDialog } from '@/lib/useDialog';
import { sortedSections } from '@/lib/sortedSections';
import { newExamId, writeClassExams, type ClassExamView, type Coverage } from '@/lib/classExams';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { persisted } from '@/lib/safeStorage';
import { toast } from '@/store/toast';
import { roman } from '@/lib/roman';
import { Icon } from './Icon';

interface ClassExamDialogProps {
  code: string;
  /** The class's lectures, in order. */
  lectures: [string, Course][];
  /** Every exam the class has now. */
  exams: ClassExamView[];
  /** The exam to change, or undefined to add one. */
  exam?: ClassExamView;
  onClose: () => void;
}

/**
 * One of a class's exams: its name, its date, and what is on it, ticked
 * across the class's lectures. A whole lecture, or open one and tick its
 * sections.
 *
 * Saving writes each lecture the exams that cover it (lib/classExams), so
 * Today, Review and the library plan from it with no change: each lecture
 * follows the nearest exam that covers it.
 */
export function ClassExamDialog({ code, lectures, exams, exam, onClose }: ClassExamDialogProps) {
  useDialog(onClose);
  const updateCourse = useCoursesStore((s) => s.updateCourse);
  const [name, setName] = useState(exam?.name ?? '');
  const [date, setDate] = useState(exam?.date ?? '');
  const [covers, setCovers] = useState<Record<string, Coverage>>(
    () => exam?.covers ?? Object.fromEntries(lectures.map(([id]) => [id, 'all' as Coverage])),
  );
  const [open, setOpen] = useState<string | null>(null);

  const sectionsOf = (course: Course) => sortedSections(course).map((s) => s.id);
  /** The sections ticked in a lecture, as a list. */
  const ticked = (id: string, course: Course): string[] => {
    const c = covers[id];
    return c === 'all' ? sectionsOf(course) : (c ?? []);
  };
  const setTicked = (id: string, course: Course, list: string[]) => {
    const all = sectionsOf(course);
    setCovers((prev) => {
      const next = { ...prev };
      if (!list.length) delete next[id];
      else next[id] = list.length === all.length ? 'all' : all.filter((s) => list.includes(s));
      return next;
    });
  };
  const anything = Object.keys(covers).length > 0;

  const write = (list: ClassExamView[]) => {
    const changed = writeClassExams(lectures, list);
    return persisted(() => {
      for (const [id, course] of Object.entries(changed)) updateCourse(id, course);
    }).ok;
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!date || !anything) return;
    const id = exam?.id ?? newExamId(exams.map((x) => x.id));
    const mine: ClassExamView = { id, name: name.trim() || 'Exam', date, covers };
    const ok = write([...exams.filter((x) => x.id !== id), mine]);
    toast(ok ? `${mine.name} saved.` : "Browser storage is full, so this wasn't saved.", { type: ok ? 'success' : 'error' });
    onClose();
  };

  const remove = () => {
    if (!exam) return;
    // Undo puts back the exams the lectures held, own exams included, and
    // only those: anything else changed since (an edit, a sync) stays.
    const before = lectures.map(([id, c]) => [id, c.metadata.exams, c.metadata.exam_date, c.metadata.exam_sections] as const);
    write(exams.filter((x) => x.id !== exam.id));
    toast(`${exam.name} removed.`, {
      type: 'info',
      actionLabel: 'Undo',
      onAction: () => {
        persisted(() => {
          for (const [id, list, date, sections] of before) {
            const now = useCoursesStore.getState().courses[id];
            if (!now) continue;
            const metadata = { ...now.metadata, exams: list, exam_date: date, exam_sections: sections };
            for (const key of ['exams', 'exam_date', 'exam_sections'] as const) if (metadata[key] === undefined) delete metadata[key];
            updateCourse(id, { ...now, metadata });
          }
        });
      },
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={exam ? `${exam.name} for ${code}` : `New exam for ${code}`}
    >
      <form onSubmit={save} className="my-8 w-full max-w-lg paper-grain rounded-sm border border-border-strong bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold text-text">{exam ? 'Exam' : 'New exam'} for {code}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="tap-safe -m-2 p-2 text-text-3 hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-6 px-5 py-4">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-sm font-medium text-text">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Midterm 1"
                className="field w-full text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="field text-sm" />
            </label>
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-text">What&rsquo;s on it</legend>
            <p className="mb-2 text-xs text-text-3">
              Tick whole lectures, or open one to tick its sections. In the last few days, new material comes from
              these first.
            </p>
            <ul className="border-y border-border">
              {lectures.map(([id, course], i) => {
                const all = sectionsOf(course);
                const on = ticked(id, course);
                const some = on.length > 0 && on.length < all.length;
                const opened = open === id;
                return (
                  <li key={id} className="border-b border-border last:border-b-0">
                    <div className="flex items-baseline gap-3 py-2 text-small">
                      <label className="tap-safe flex min-w-0 flex-1 cursor-pointer items-baseline gap-3">
                        <input
                          type="checkbox"
                          checked={all.length === 0 ? !!covers[id] : on.length > 0}
                          ref={(el) => {
                            if (el) el.indeterminate = some;
                          }}
                          onChange={() =>
                            // A lecture with no sections yet is on the exam or not, as a whole.
                            all.length === 0
                              ? setCovers((prev) => {
                                  const next = { ...prev };
                                  if (next[id]) delete next[id];
                                  else next[id] = 'all';
                                  return next;
                                })
                              : setTicked(id, course, on.length === all.length ? [] : all)
                          }
                        />
                        <span className="mark w-7 shrink-0 text-right text-text-3">{roman(i + 1)}</span>
                        <span className={`min-w-0 ${on.length ? 'text-text' : 'text-text-3'}`}>{course.metadata.title}</span>
                      </label>
                      {all.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOpen(opened ? null : id)}
                          aria-expanded={opened}
                          className="tap-safe shrink-0 whitespace-nowrap text-text-3 hover:text-text"
                        >
                          {on.length === all.length ? `all ${all.length}` : `${on.length} of ${all.length}`} {opened ? '▾' : '▸'}
                        </button>
                      )}
                    </div>
                    {opened && (
                      <ul className="mb-2 ml-6 border-l border-border pl-3">
                        {sortedSections(course).map((s, n) => (
                          <li key={s.id}>
                            <label className="tap-safe flex cursor-pointer items-baseline gap-3 py-1 text-small">
                              <input
                                type="checkbox"
                                checked={on.includes(s.id)}
                                onChange={() => setTicked(id, course, on.includes(s.id) ? on.filter((x) => x !== s.id) : [...on, s.id])}
                              />
                              <span className="mark w-5 shrink-0 text-right tabular-nums text-text-3">{n + 1}</span>
                              <span className={on.includes(s.id) ? 'text-text' : 'text-text-3'}>{s.title}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            <span className="mt-2 flex gap-4 text-small">
              <button
                type="button"
                className="tap-safe text-text-2 hover:text-text"
                onClick={() => setCovers(Object.fromEntries(lectures.map(([id]) => [id, 'all' as Coverage])))}
              >
                All
              </button>
              <button type="button" className="tap-safe text-text-2 hover:text-text" onClick={() => setCovers({})}>
                None
              </button>
            </span>
          </fieldset>
        </div>

        <div className="flex items-center gap-2 border-t border-border px-5 py-3">
          {exam && (
            <button type="button" onClick={remove} className="tap-safe mr-auto text-small text-text-3 hover:text-error">
              Remove this exam
            </button>
          )}
          <button type="button" onClick={onClose} className={`press ${exam ? '' : 'ml-auto'}`}>
            Cancel
          </button>
          <button type="submit" disabled={!date || !anything} className="press press-ink">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
