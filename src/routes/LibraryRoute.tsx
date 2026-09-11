import { useRef, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';

/** "/" — the course library. Upload + list are wired to the real store; a
 *  richer grid (search, tags, delete/undo) is ported alongside the item
 *  renderers in the next pass. */
export function LibraryRoute() {
  const courses = useCoursesStore((s) => s.courses);
  const importCourse = useCoursesStore((s) => s.importCourse);
  const inputRef = useRef<HTMLInputElement>(null);
  const ids = Object.keys(courses);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await importCourse(file);
    if (!result.ok) {
      // TODO: swap for the Radix Toast once it's wired up.
      window.alert(result.error);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">My Courses</h1>
        <button
          type="button"
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          onClick={() => inputRef.current?.click()}
        >
          + Upload Course
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.study.json"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {ids.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-text-2">
          No courses yet. Upload a{' '}
          <code className="rounded bg-accent-light px-1 font-mono text-accent">.study.json</code> file
          to get started.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {ids.map((id) => {
            const course = courses[id];
            return (
              <li key={id}>
                <Link
                  to={`/study/${id}`}
                  className="block rounded-lg border border-border bg-surface p-4 shadow transition-colors hover:border-accent-border"
                >
                  {course.metadata.course_code && (
                    <div className="text-xs font-medium uppercase tracking-wide text-text-3">
                      {course.metadata.course_code}
                    </div>
                  )}
                  <div className="font-semibold text-text">{course.metadata.title}</div>
                  <div className="mt-1 text-sm text-text-2">
                    {course.sections.length} section{course.sections.length !== 1 ? 's' : ''}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
