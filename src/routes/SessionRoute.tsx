import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { useSessionStore } from '@/store/session';
import { STUDY_MODES, type StudyMode } from '@/lib/buildSessionItems';

function isStudyMode(mode: string | undefined): mode is StudyMode {
  return !!mode && (STUDY_MODES as readonly string[]).includes(mode);
}

/** "/session/:id/:mode" — the active study session. Builds the real item
 *  list via useSessionStore; the per-type card renderers (MCQ, flashcard,
 *  definition, example, graphic) are ported next. */
export function SessionRoute() {
  const { id, mode } = useParams<{ id: string; mode: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  const init = useSessionStore((s) => s.init);
  const total = useSessionStore((s) => s.total());
  const current = useSessionStore((s) => s.current());
  const index = useSessionStore((s) => s.index);

  useEffect(() => {
    if (id && course && isStudyMode(mode)) init(id, course, mode);
  }, [id, course, mode, init]);

  if (!id || !isStudyMode(mode)) return <Navigate to="/" replace />;
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
    <div className="mx-auto max-w-2xl p-6">
      <Link to={`/study/${id}`} className="text-sm text-text-2 hover:text-text">
        ← Back
      </Link>
      <div className="mt-4 rounded-lg border border-border bg-surface p-6">
        <div className="text-sm font-medium uppercase tracking-wide text-text-3">{mode}</div>
        <div className="mt-1 text-lg text-text">
          {total === 0 ? 'No items for this mode yet.' : `Item ${index + 1} of ${total}`}
        </div>
        {current && (
          <div className="mt-3 text-sm text-text-2">
            Type: {current.type} · Section: {current._sectionTitle}
          </div>
        )}
        <p className="mt-4 text-sm text-text-3">
          Item renderers (MCQ, flashcard, definition, example, graphic) are ported next.
        </p>
      </div>
    </div>
  );
}
