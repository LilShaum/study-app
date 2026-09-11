import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';

/** "/study/:id/progress" — accuracy dashboard. The weakest-tags/sections
 *  breakdown is ported alongside the item renderers in the next pass. */
export function ProgressRoute() {
  const { id } = useParams<{ id: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
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

  const studiedCount = Object.keys(progress).length;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link to={`/study/${id}`} className="text-sm text-text-2 hover:text-text">
        ← Back
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-text">{course.metadata.title} — Progress</h1>
      <p className="mt-2 text-text-2">
        {studiedCount} item{studiedCount !== 1 ? 's' : ''} studied so far.
      </p>
      <p className="mt-4 text-sm text-text-3">The full accuracy dashboard is ported next.</p>
    </div>
  );
}
