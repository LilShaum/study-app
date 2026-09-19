import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { useResumeStore } from '@/store/resume';
import { toast } from '@/store/toast';
import { Icon } from '@/components/Icon';
import { NewCourseDialog } from '@/components/NewCourseDialog';

/** "/" — the course library: upload, search/tag filter, open, and quietly-hidden delete-with-undo. */
export function LibraryRoute() {
  const courses = useCoursesStore((s) => s.courses);
  const importCourse = useCoursesStore((s) => s.importCourse);
  const removeCourse = useCoursesStore((s) => s.removeCourse);
  const updateCourse = useCoursesStore((s) => s.updateCourse);
  const inputRef = useRef<HTMLInputElement>(null);
  const ids = Object.keys(courses);

  const [creating, setCreating] = useState(false);
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
    const bookmarkSnapshot = useResumeStore.getState().getBookmark(id);
    removeCourse(id);
    useProgressStore.getState().removeCourseProgress(id);
    useResumeStore.getState().clear(id);
    toast(`"${title}" removed from library.`, {
      type: 'info',
      actionLabel: 'Undo',
      onAction: () => {
        updateCourse(id, courseSnapshot);
        useProgressStore.setState((s) => ({ byCourse: { ...s.byCourse, [id]: progressSnapshot } }));
        useResumeStore.getState().restore(id, bookmarkSnapshot);
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Wraps rather than squeezing: at 390px the title, the count and two
          buttons do not fit on one line, and a row that cannot wrap shrinks
          its children instead. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold text-text">My Courses</h1>
          <span className="whitespace-nowrap text-sm text-text-3">
            {isFiltering
              ? `${filteredIds.length} of ${ids.length} course${ids.length !== 1 ? 's' : ''}`
              : `${ids.length} course${ids.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded border border-border px-3 py-1.5 text-sm text-text-2 hover:border-accent-border hover:text-text"
            onClick={() => inputRef.current?.click()}
          >
            <Icon name="download" size={14} />
            Upload
          </button>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
            onClick={() => setCreating(true)}
          >
            <Icon name="plus" size={14} />
            New course
          </button>
        </div>
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
          <div className="mb-3 flex justify-center text-text-3">
            <Icon name="library" size={40} />
          </div>
          <p>No courses yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm">
            A course is a{' '}
            <code className="rounded bg-accent-light px-1 font-mono text-accent">.study.json</code>{' '}
            file generated from your own notes. Start here and the app will give you the prompt.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            <Icon name="plus" size={14} />
            New course
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 space-y-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3">
                <Icon name="search" size={14} />
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses…"
                aria-label="Search courses"
                className="w-full rounded border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
              />
            </div>
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
                      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded text-text-3 opacity-0 transition-opacity hover:bg-error-bg hover:text-error group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-70"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {creating && <NewCourseDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
