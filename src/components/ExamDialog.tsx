import { useState, type FormEvent } from 'react';
import { useDialog } from '@/lib/useDialog';
import { sortedSections } from '@/lib/sortedSections';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { usePlanStore } from '@/store/plan';
import { persisted } from '@/lib/safeStorage';
import { toast } from '@/store/toast';
import { Icon } from './Icon';

const MINUTE_CHOICES = [15, 20, 30, 45, 60, 90];

interface ExamDialogProps {
  courseId: string;
  course: Course;
  onClose: () => void;
}

/**
 * The exam, what it covers, and how long a day you have.
 *
 * Three questions together because each only means something with the
 * others, and the simulator showed the middle one matters most: a date
 * without its sections cost points (sim/FINDINGS.md), because the last days'
 * push went into material the exam did not cover. So the sections are asked
 * for right under the date, all ticked, for the student to untick what is
 * not on it.
 *
 * The exam lives in the course file (a classmate you share it with sits the
 * same exam); the minutes live on this device (store/plan).
 */
export function ExamDialog({ courseId, course, onClose }: ExamDialogProps) {
  useDialog(onClose);
  const updateCourse = useCoursesStore((s) => s.updateCourse);
  const minutesNow = usePlanStore((s) => s.minutesFor(courseId));
  const setMinutes = usePlanStore((s) => s.setMinutes);

  const sections = sortedSections(course);
  const [date, setDate] = useState(course.metadata.exam_date ?? '');
  const [covered, setCovered] = useState<Set<string>>(
    () => new Set(course.metadata.exam_sections?.length ? course.metadata.exam_sections : sections.map((s) => s.id)),
  );
  const [minutes, setMinutesDraft] = useState(minutesNow);

  const toggle = (id: string) =>
    setCovered((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = (e: FormEvent) => {
    e.preventDefault();
    const metadata = { ...course.metadata };
    if (date) metadata.exam_date = date;
    else delete metadata.exam_date;
    // Always an explicit list: sections added later are asked about when
    // they are added (lib/exam.ts, examAfterAdding), never assumed.
    if (date && covered.size) metadata.exam_sections = sections.map((s) => s.id).filter((id) => covered.has(id));
    else delete metadata.exam_sections;
    setMinutes(courseId, minutes);
    const { ok } = persisted(() => updateCourse(courseId, { ...course, metadata }));
    toast(ok ? 'Saved.' : "Browser storage is full, so this wasn't saved.", { type: ok ? 'success' : 'error' });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Exam and study time"
    >
      <form onSubmit={save} className="my-8 w-full max-w-lg paper-grain rounded-sm border border-border-strong bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold text-text">Exam and study time</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="tap-safe -m-2 p-2 text-text-3 hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-6 px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Exam date</span>
            <span className="flex items-baseline gap-4">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field text-sm" />
              {date && (
                <button type="button" onClick={() => setDate('')} className="tap-safe text-small text-text-3 hover:text-text">
                  No exam
                </button>
              )}
            </span>
          </label>

          {date && sections.length > 1 && (
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-text">What it covers</legend>
              <p className="mb-2 text-xs text-text-3">
                Untick anything that won&rsquo;t be on it. In the last few days, new material comes
                from these first.
              </p>
              <ul className="max-h-64 overflow-y-auto border-y border-border">
                {sections.map((s, i) => (
                  <li key={s.id} className="border-b border-border last:border-b-0">
                    <label className="tap-safe flex cursor-pointer items-baseline gap-3 py-2 text-small">
                      <input type="checkbox" checked={covered.has(s.id)} onChange={() => toggle(s.id)} />
                      <span className="mark w-5 shrink-0 text-right tabular-nums text-text-3">{i + 1}</span>
                      <span className={covered.has(s.id) ? 'text-text' : 'text-text-3'}>{s.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <span className="mt-2 flex gap-4 text-small">
                <button type="button" className="tap-safe text-text-2 hover:text-text" onClick={() => setCovered(new Set(sections.map((s) => s.id)))}>
                  All
                </button>
                <button type="button" className="tap-safe text-text-2 hover:text-text" onClick={() => setCovered(new Set())}>
                  None
                </button>
              </span>
            </fieldset>
          )}

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-text">Time a day</legend>
            <p className="mb-2 text-xs text-text-3">Today&rsquo;s session is sized to this.</p>
            <div role="radiogroup" aria-label="Minutes a day" className="flex flex-wrap gap-x-4 gap-y-2">
              {MINUTE_CHOICES.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={minutes === m}
                  onClick={() => setMinutesDraft(m)}
                  className={`tap-safe px-0.5 text-small tabular-nums ${
                    minutes === m
                      ? 'text-accent underline decoration-accent decoration-2 underline-offset-4'
                      : 'text-text-2 hover:text-text'
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="press">
            Cancel
          </button>
          <button type="submit" disabled={Boolean(date) && covered.size === 0} className="press press-ink">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
