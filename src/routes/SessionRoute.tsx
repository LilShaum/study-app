import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { STUDY_MODES, type StudyMode } from '@/lib/buildSessionItems';
import { BrowseSession } from '@/components/session/BrowseSession';
import { CardSession } from '@/components/session/CardSession';

function isStudyMode(mode: string | undefined): mode is StudyMode {
  return !!mode && (STUDY_MODES as readonly string[]).includes(mode);
}

/** "/session/:id/:mode" — dispatches to the editable Browse feed or the one-at-a-time card flow. */
export function SessionRoute() {
  const { id, mode } = useParams<{ id: string; mode: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));

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

  return mode === 'browse' ? (
    <BrowseSession courseId={id} course={course} />
  ) : (
    <CardSession courseId={id} course={course} mode={mode} />
  );
}
