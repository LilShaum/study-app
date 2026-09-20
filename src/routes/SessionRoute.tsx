import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { STUDY_MODES, type StudyMode } from '@/lib/buildSessionItems';
import { BrowseSession } from '@/components/session/BrowseSession';
import { CardSession } from '@/components/session/CardSession';

function isStudyMode(mode: string | undefined): mode is StudyMode {
  return !!mode && (STUDY_MODES as readonly string[]).includes(mode);
}

/**
 * "/session/:id/:mode" — dispatches to the editable Browse feed or the
 * one-at-a-time card flow.
 *
 * `?section=<id>` scopes the session to a single section, and `?resume=1`
 * starts from the course's saved bookmark. Both are search params rather than
 * path segments so that every existing session link keeps working and means
 * exactly what it did before.
 */
export function SessionRoute() {
  const { id, mode } = useParams<{ id: string; mode: string }>();
  const [search] = useSearchParams();
  const sectionId = search.get('section') ?? undefined;
  // "?resume=1" is what the course page's Continue card adds; opening a mode
  // from its own tile deliberately starts fresh.
  const resume = search.get('resume') === '1';
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));

  if (!id || !isStudyMode(mode)) return <Navigate to="/" replace />;

  if (!course) {
    return (
      <div className="py-6 text-center text-text-2">
        Course not found.{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  // A section filter that matches nothing would strand the student in an empty
  // session; treat an unknown id as "whole course" instead.
  const scoped = sectionId && course.sections.some((s) => s.id === sectionId) ? sectionId : undefined;

  return mode === 'browse' ? (
    <BrowseSession courseId={id} course={course} />
  ) : (
    <CardSession courseId={id} course={course} mode={mode} sectionId={scoped} resume={resume} />
  );
}
