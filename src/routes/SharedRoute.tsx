import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { cloudError, fetchSharedCourse } from '@/lib/cloud';
import { persisted } from '@/lib/safeStorage';
import { useCoursesStore } from '@/store/courses';
import { toast } from '@/store/toast';

/** What a share link opens: the course, and a button to add it. Nothing is added without asking. */
export function SharedRoute() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const addCourse = useCoursesStore((s) => s.addCourse);
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchSharedCourse(id)
      .then((c) => live && setCourse(c))
      .catch((e) => live && setError(cloudError(e)));
    return () => {
      live = false;
    };
  }, [id]);

  const add = () => {
    if (!course) return;
    const { result: newId, ok } = persisted(() => addCourse(course));
    if (!ok) {
      toast("Browser storage is full, so this wasn't saved.", { type: 'error' });
      return;
    }
    toast(`"${course.metadata.title}" added to your library.`, { type: 'success' });
    navigate(`/study/${newId}`);
  };

  const items = course?.sections.reduce((n, s) => n + s.items.length, 0) ?? 0;

  return (
    <div className="mx-auto max-w-lg">
      <p className="mark text-text-3">Shared with you</p>
      {error ? (
        <>
          <p className="mt-3 text-text">{error}</p>
          <Link to="/" className="press tap-safe mt-6 inline-flex">
            Go to your library
          </Link>
        </>
      ) : !course ? (
        <p className="mt-3 text-small text-text-3">Opening…</p>
      ) : (
        <>
          <h1 className="mt-2 font-display text-display text-text">{course.metadata.title}</h1>
          <p className="mt-2 text-small text-text-2">
            {course.sections.length} {course.sections.length === 1 ? 'section' : 'sections'} · {items} items
          </p>
          <ol className="mt-4 border-y border-border text-small">
            {course.sections.map((s, i) => (
              <li key={s.id} className="flex gap-3 border-b border-border py-2 last:border-b-0">
                <span className="mark w-5 shrink-0 text-right tabular-nums text-text-3">{i + 1}</span>
                <span className="text-text">{s.title}</span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={add} className="press press-ink tap-safe mt-6">
            Add to my library
          </button>
        </>
      )}
    </div>
  );
}
