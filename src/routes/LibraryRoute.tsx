import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { toast } from '@/store/toast';

/** "/" — the course library: upload, search/tag filter, open, and quietly-hidden delete-with-undo. */
export function LibraryRoute() {
  const courses = useCoursesStore((s) => s.courses);
  const importCourse = useCoursesStore((s) => s.importCourse);
  const removeCourse = useCoursesStore((s) => s.removeCourse);
  const updateCourse = useCoursesStore((s) => s.updateCourse);
  const inputRef = useRef<HTMLInputElement>(null);
  const ids = Object.keys(courses);

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const allTags = useMemo(
    () => [...new Set(ids.flatMap((id) => courses[id].metadata.tags ?? []))].sort(),
    [ids, courses],
  );

  const isFiltering = search.trim() !== '' || selectedTags.size > 0;

  const filteredIds = ids.filter((id) => {
    const c = courses[id];
    const text = search.trim().toLowerCase();
    const haystack = [c.metadata.title, c.metadata.course_code, c.metadata.subject, ...(c.metadata.tags ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesText = !text || haystack.includes(text);
    const matchesTags = selectedTags.size === 0 || (c.metadata.tags ?? []).some((t) => selectedTags.has(t));
    return matchesText && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await importCourse(file);
    if (result.ok) {
      toast(`"${result.course.metadata.title || 'Course'}" uploaded.`, { type: 'success' });
    } else {
      toast(result.error, { type: 'error' });
    }
  };

  const handleDelete = (id: string, title: string) => {
    const courseSnapshot = courses[id];
    const progressSnapshot = useProgressStore.getState().getProgress(id);
    removeCourse(id);
    useProgressStore.getState().removeCourseProgress(id);
    toast(`"${title}" removed from library.`, {
      type: 'info',
      actionLabel: 'Undo',
      onAction: () => {
        updateCourse(id, courseSnapshot);
        useProgressStore.setState((s) => ({ byCourse: { ...s.byCourse, [id]: progressSnapshot } }));
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold text-text">My Courses</h1>
          <span className="text-sm text-text-3">
            {isFiltering
              ? `${filteredIds.length} of ${ids.length} course${ids.length !== 1 ? 's' : ''}`
              : `${ids.length} course${ids.length !== 1 ? 's' : ''}`}
          </span>
        </div>
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
        <>
          <div className="mb-4 space-y-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              aria-label="Search courses"
              className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
            />
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const active = selectedTags.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={active}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        active
                          ? 'border-accent bg-accent text-white'
                          : 'border-border text-text-2 hover:border-accent-border'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {filteredIds.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-text-2">
              No matching courses. Try a different search term or clear the tag filter.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filteredIds.map((id) => {
                const course = courses[id];
                return (
                  <li key={id} className="group relative">
                    <Link
                      to={`/study/${id}`}
                      className="block rounded-lg border border-border bg-surface p-4 shadow transition-colors hover:border-accent-border"
                    >
                      {course.metadata.course_code && (
                        <div className="text-xs font-medium uppercase tracking-wide text-text-3">
                          {course.metadata.course_code}
                        </div>
                      )}
                      <div className="pr-6 font-semibold text-text">{course.metadata.title}</div>
                      <div className="mt-1 text-sm text-text-2">
                        {course.sections.length} section{course.sections.length !== 1 ? 's' : ''}
                      </div>
                      {course.metadata.tags && course.metadata.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {course.metadata.tags.map((tag) => (
                            <span key={tag} className="rounded bg-accent-light px-1.5 py-0.5 text-xs text-accent">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                    <button
                      type="button"
                      aria-label={`Remove ${course.metadata.title} from library`}
                      title="Remove from library"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(id, course.metadata.title);
                      }}
                      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded text-text-3 opacity-0 transition-opacity hover:bg-error-bg hover:text-error group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
