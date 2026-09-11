import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { exportCourse } from '@/lib/exportCourse';
import { toast } from '@/store/toast';
import type { StudyMode } from '@/lib/buildSessionItems';

const MODES: { mode: StudyMode; label: string; desc: string }[] = [
  { mode: 'browse', label: 'Browse', desc: 'Read all content in order' },
  { mode: 'quiz', label: 'Quiz', desc: 'MCQs one at a time' },
  { mode: 'flashcards', label: 'Flashcards', desc: 'Flip & track recall' },
  { mode: 'definitions', label: 'Definitions', desc: 'Term → reveal' },
  { mode: 'mixed', label: 'Mixed', desc: 'All types, shuffled' },
  { mode: 'missed', label: 'Review Missed', desc: 'Retry what you got wrong' },
];

/** "/study/:id" — course overview + mode picker. */
export function CourseRoute() {
  const { id } = useParams<{ id: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));

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
          className="text-sm text-text-2 hover:text-text"
        >
          ↓ Export .study.json
        </button>
      </div>

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
            <div className="font-medium text-text">{m.label}</div>
            <div className="text-sm text-text-2">{m.desc}</div>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-text-3">
        Sections ({course.sections.length})
      </h2>
      <ul className="space-y-2">
        {course.sections.map((section) => (
          <li key={section.id} className="rounded border border-border bg-surface px-4 py-2">
            <div className="font-medium text-text">{section.title}</div>
            <div className="text-sm text-text-3">{section.items.length} items</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
