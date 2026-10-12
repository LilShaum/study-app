import { useLayoutEffect } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { useSessionStore } from '@/store/session';
import { STUDY_MODES, type CardKind, type StudyMode } from '@/lib/buildSessionItems';
import { BrowseSession } from '@/components/session/BrowseSession';
import { CardSession } from '@/components/session/CardSession';

const KINDS: readonly CardKind[] = ['questions', 'flashcards', 'terms'];

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
 * exactly what it did before. `?kind=questions|flashcards|terms` is the
 * Practice page's filter for Review, Weakest first and Review missed.
 */
export function SessionRoute() {
  const { id, mode } = useParams<{ id: string; mode: string }>();
  const [search] = useSearchParams();
  const sectionId = search.get('section') ?? undefined;
  // "?resume=1" is what the course page's Continue card adds; opening a mode
  // from its own tile deliberately starts fresh.
  const resume = search.get('resume') === '1';
  // "?class=CODE": Today started from a class page carries on within the class.
  const classCode = search.get('class') ?? undefined;
  const rawKind = search.get('kind');
  const kind = KINDS.find((k) => k === rawKind);
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  // Handed to the session store before CardSession's effect starts the
  // session (layout effects run first), which reads it when it builds the list.
  useLayoutEffect(() => {
    useSessionStore.getState().setPendingKind(kind ?? null);
  }, [kind]);

  if (!id || !isStudyMode(mode)) return <Navigate to="/" replace />;

  if (!course) {
    return (
      <div className="py-6 text-center text-text-2">
        Lecture not found.{' '}
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
    // Keyed by kind, so a link that changes only ?kind= starts the session again.
    <CardSession key={kind ?? 'all'} courseId={id} course={course} mode={mode} sectionId={scoped} resume={resume} classCode={classCode} />
  );
}
