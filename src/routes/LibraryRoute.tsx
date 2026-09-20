import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { useResumeStore } from '@/store/resume';
import { beginWriteCheck, writesLanded } from '@/lib/safeStorage';
import { toast } from '@/store/toast';
import { Icon } from '@/components/Icon';
import { Sprig } from '@/components/Sprig';
import { CourseTree } from '@/components/CourseTree';
import { sectionStats } from '@/lib/sectionStats';
import { NewCourseDialog } from '@/components/NewCourseDialog';

const STORAGE_FULL =
  "Browser storage is full, so this wasn't saved — it will disappear when you reload. Export a course you've finished and remove it, then try again.";

/**
 * The entry's number in the contents list.
 *
 * Roman for the same reason a book uses it in the front matter: it numbers
 * the entries without competing with the arabic figures in the right-hand
 * column, which are the ones carrying information.
 */
function roman(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  for (const [value, sign] of table) {
    while (n >= value) {
      out += sign;
      n -= value;
    }
  }
  return out;
}

/** A course's totals, aggregated from the same per-section figures the course page uses. */
function courseTotals(course: Course, progress: Record<string, ItemResult>) {
  let total = 0;
  let got = 0;
  let attempts = 0;
  for (const section of course.sections) {
    const stats = sectionStats(section, progress);
    total += stats.total;
    got += stats.got;
    attempts += stats.got + stats.missed;
  }
  return { total, accuracy: attempts > 0 ? Math.round((got / attempts) * 100) : null };
}

/** "/" — the course library: upload, search/tag filter, open, and quietly-hidden delete-with-undo. */
export function LibraryRoute() {
  const courses = useCoursesStore((s) => s.courses);
  const allProgress = useProgressStore((s) => s.byCourse);
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
    // The upload has to report on the WRITE, not just the parse: with storage
    // full the course lands in memory, shows in the library, and is gone on
    // the next reload. Saying "uploaded" then is simply untrue.
    beginWriteCheck();
    const imported = await importCourse(file);
    // Read AFTER the await: importCourse reads the file first, so the write
    // it triggers has not happened by the time the call returns.
    const ok = writesLanded();
    if (!imported.ok) {
      toast(imported.error, { type: 'error' });
      return;
    }
    if (ok) {
      toast(`"${imported.course.metadata.title || 'Course'}" uploaded.`, { type: 'success' });
    } else {
      toast(STORAGE_FULL, { type: 'error', duration: 12000 });
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
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="font-display text-display font-semibold text-text">My courses</h1>
          <p className="mark mt-1 text-text-3">
            {isFiltering
              ? `${filteredIds.length} of ${ids.length} shown`
              : `${ids.length} in the library`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="press tap-safe" onClick={() => inputRef.current?.click()}>
            <Icon name="upload" size={13} />
            Upload
          </button>
          <button type="button" className="press press-ink tap-safe" onClick={() => setCreating(true)}>
            <Icon name="plus" size={13} />
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
        <div className="border-y border-border py-14 text-center text-text-2">
          <div className="mb-5 flex justify-center text-text-3">
            <Sprig size={48} />
          </div>
          <p className="font-display text-heading text-text">The library is empty.</p>
          <p className="mx-auto mt-2 max-w-md text-small">
            A course is a{' '}
            <code className="font-mono text-text-2">.study.json</code> file generated from your own
            notes. Start here and the app will give you the prompt.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="press press-ink tap-safe mt-6"
          >
            <Icon name="plus" size={13} />
            New course
          </button>
        </div>
      ) : (
        <>
          {/* The apparatus of a contents page: a ruled line to write the
              search on, and the subjects set as an index line. Both used to
              be web furniture — a grey rounded search box and a row of
              filled pill chips — which is the look the page was trying to
              get away from. A selected subject is underscored, the way you
              would mark an index entry, not filled in. */}
          <div className="mb-7 space-y-4">
            <label className="flex items-baseline gap-3">
              <span className="mark shrink-0 text-text-3">Find</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="title, code or subject"
                aria-label="Search courses"
                className="field w-full text-small"
              />
            </label>
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2">
                <span className="mark mr-2 text-text-3">Subjects</span>
                {allTags.map((tag, i) => {
                  const active = selectedTags.has(tag);
                  return (
                    <span key={tag} className="flex items-baseline">
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        aria-pressed={active}
                        className={`px-0.5 text-small transition-colors ${
                          active
                            ? 'text-accent underline decoration-accent decoration-2 underline-offset-4'
                            : 'text-text-2 hover:text-text hover:underline hover:underline-offset-4'
                        }`}
                      >
                        {tag}
                      </button>
                      {i < allTags.length - 1 && <span className="ml-1 text-text-3">·</span>}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {filteredIds.length === 0 ? (
            <div className="border-y border-border py-12 text-center text-text-2">
              No matching courses. Try a different search term or clear the subject filter.
            </div>
          ) : (
            /* A contents list, not a card grid.
               Two columns of shadowed, rounded, filled boxes is a dashboard
               — and it also reads worse: the eye has to re-find the title
               in every box. A ruled list with the figures in a right-hand
               column lets you scan one edge, which is exactly why books
               have set contents this way for four hundred years. */
            <ul className="border-t border-border">
              {filteredIds.map((id, index) => {
                const course = courses[id];
                const stats = courseTotals(course, allProgress[id] ?? EMPTY_PROGRESS);
                return (
                  <li key={id} className="group relative border-b border-border">
                    <Link to={`/study/${id}`} className="entry py-4 pr-8">
                      <span className="entry-num mark text-right text-text-3">
                        {roman(index + 1)}
                      </span>
                      <CourseTree
                        courseId={id}
                        course={course}
                        progress={allProgress[id] ?? EMPTY_PROGRESS}
                        className="entry-art h-12 w-12 sm:h-16 sm:w-16"
                        on="card"
                      />
                      <span className="entry-body min-w-0">
                        {course.metadata.course_code && (
                          <span className="mark block text-text-3">
                            {course.metadata.course_code}
                          </span>
                        )}
                        {/* The leaders sit on the TITLE's baseline, so they
                            share a line with the entry whose eye they are
                            carrying — not the code above it. Hidden on a
                            phone, where there is no run of empty width for
                            them to be dots rather than a smudge. */}
                        <span className="flex items-baseline gap-2">
                          <span className="font-display text-heading font-semibold leading-snug text-text group-hover:text-accent">
                            {course.metadata.title}
                          </span>
                          <span className="leaders hidden sm:block" aria-hidden="true" />
                        </span>
                      </span>
                      <span className="entry-figs tabular-nums">
                        <span className="mark block text-text-2">
                          {stats.total} item{stats.total !== 1 ? 's' : ''}
                        </span>
                        <span className="mark block text-text-3">
                          {course.sections.length} section{course.sections.length !== 1 ? 's' : ''}
                          {stats.accuracy !== null && <> · {stats.accuracy}%</>}
                        </span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-label={`Remove ${course.metadata.title} from library`}
                      title="Remove from library"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(id, course.metadata.title);
                      }}
                      className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-text-3 opacity-0 transition-opacity hover:text-error group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-60"
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
