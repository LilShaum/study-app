import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { findSection } from '@/lib/sectionStats';
import { SectionDetail } from '@/components/SectionDetail';

/**
 * "/study/:id/section/:sectionId" — one section on its own.
 *
 * The course overview listed sections but they were inert: you could see a
 * title and a count and do nothing with either. On a 150-item course that
 * matters, because "study everything or nothing" is exactly wrong when you
 * know which two sections you're weak on.
 *
 * Per-section progress needs no new storage — progress is keyed per item id
 * and a section knows its items, so these figures are a slice of the map that
 * already exists.
 */
export function SectionRoute() {
  const { id, sectionId } = useParams<{ id: string; sectionId: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  // The fallback must be the shared frozen instance: a fresh `{}` here is a
  // new snapshot on every store read, which is the render loop EMPTY_PROGRESS
  // exists to prevent.
  const progress = useProgressStore((s) => (id ? s.getProgress(id) : EMPTY_PROGRESS));

  if (!id || !sectionId) return <Navigate to="/" replace />;

  const section = course ? findSection(course, sectionId) : undefined;
  if (!course || !section) {
    return (
      <div className="py-6 text-center text-text-2">
        Section not found.{' '}
        <Link to={course ? `/study/${id}` : '/'} className="text-accent hover:underline">
          {course ? 'Back to lecture' : 'Back to Library'}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← {course.metadata.title}
      </Link>
      <div className="mt-4">
        <SectionDetail courseId={id} course={course} section={section} progress={progress} />
      </div>
    </div>
  );
}
