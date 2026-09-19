import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { exportCourse } from '@/lib/exportCourse';
import { sortedSections } from '@/lib/sortedSections';
import { sectionStats } from '@/lib/sectionStats';
import { useProgressStore } from '@/store/progress';
import { toast } from '@/store/toast';
import { Icon, type IconName } from '@/components/Icon';
import { AddToCourseDialog, type AddMode } from '@/components/AddToCourseDialog';
import { CourseHealthPanel } from '@/components/CourseHealthPanel';
import type { StudyMode } from '@/lib/buildSessionItems';

const MODES: { mode: StudyMode; label: string; desc: string; icon: IconName }[] = [
  { mode: 'browse', label: 'Browse', desc: 'Read all content in order', icon: 'book-open' },
  { mode: 'quiz', label: 'Quiz', desc: 'MCQs one at a time', icon: 'help-circle' },
  { mode: 'flashcards', label: 'Flashcards', desc: 'Flip & track recall', icon: 'layers' },
  { mode: 'definitions', label: 'Definitions', desc: 'Term → reveal', icon: 'file-text' },
  { mode: 'mixed', label: 'Mixed', desc: 'All types, shuffled', icon: 'shuffle' },
  { mode: 'missed', label: 'Review Missed', desc: 'Retry what you got wrong', icon: 'repeat' },
];

/** "/study/:id" — course overview + mode picker. */
export function CourseRoute() {
  const { id } = useParams<{ id: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  const [adding, setAdding] = useState<AddMode | null>(null);
  const progress = useProgressStore((s) => (id ? s.getProgress(id) : {}));

  if (!id) return <Navigate to="/" replace />;
  if (!course) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center text-text-2">
        Course not found.{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link to="/" className="text-sm text-text-2 hover:text-text">
        ← Library
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-text">{course.metadata.title}</h1>
      {course.metadata.description && <p className="mt-1 text-text-2">{course.metadata.description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Link to={`/study/${id}/progress`} className="text-sm text-accent hover:underline">
          View progress →
        </Link>
        <button
          type="button"
          onClick={() => {
            exportCourse(id, course);
            toast('Course exported.', { type: 'success' });
          }}
          className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text"
        >
          <Icon name="download" size={14} />
          Export .study.json
        </button>
        <button
          type="button"
          onClick={() => setAdding('material')}
          className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text"
        >
          <Icon name="plus" size={14} />
          Add material
        </button>
        <button
          type="button"
          onClick={() => setAdding('practice')}
          className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text"
        >
          <Icon name="repeat" size={14} />
          More practice
        </button>
      </div>

      <CourseHealthPanel course={course} />

      <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-text-3">
        Choose a Study Mode
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((m) => (
          <Link
            key={m.mode}
            to={`/session/${id}/${m.mode}`}
            className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent-border"
          >
            <span className="mb-2 block text-accent">
              <Icon name={m.icon} size={22} />
            </span>
            <div className="font-medium text-text">{m.label}</div>
            <div className="text-sm text-text-2">{m.desc}</div>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-text-3">
        Sections ({course.sections.length})
      </h2>
      <ul className="space-y-2">
        {sortedSections(course).map((section) => {
          const stats = sectionStats(section, progress);
          return (
            <li key={section.id}>
              <Link
                to={`/study/${id}/section/${encodeURIComponent(section.id)}`}
                className="flex items-center gap-3 rounded border border-border bg-surface px-4 py-2.5 transition-colors hover:border-accent-border"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-text">{section.title}</span>
                  <span className="block text-sm text-text-3">
                    {section.items.length} item{section.items.length === 1 ? '' : 's'}
                    {stats.accuracy !== null && (
                      <>
                        {' · '}
                        <span
                          className={
                            stats.accuracy >= 80
                              ? 'text-success'
                              : stats.accuracy >= 50
                                ? 'text-warning'
                                : 'text-error'
                          }
                        >
                          {stats.accuracy}%
                        </span>
                        <span className="text-text-3"> over {stats.studied} studied</span>
                      </>
                    )}
                  </span>
                </span>
                <span className="text-text-3" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {adding && (
        <AddToCourseDialog
          courseId={id}
          course={course}
          initialMode={adding}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  );
}
