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
import { scoredEntries } from '@/lib/scored';
import { isDueFor } from '@/lib/memory';
import { sectionStats } from '@/lib/sectionStats';
import { NewCourseDialog } from '@/components/NewCourseDialog';
import { examRule } from '@/lib/exam';
import { RestoreButton } from '@/components/Backup';
import { measuredPace, useStudyLogStore } from '@/store/studyLog';
import { usePlanStore } from '@/store/plan';
import { todayAcrossCourses, type CourseToday } from '@/lib/libraryToday';

/** The most courses the Today block names; the list below carries the rest. */
const TODAY_ROWS = 3;

/** "12 to review · new material · exam in 4 days" — only the parts that apply. */
function todayLine(c: CourseToday): string {
  return [
    c.review > 0 ? `${c.review} to review` : null,
    c.hasNew ? 'new material' : null,
    c.examDays === 0 ? 'exam today' : c.examDays === 1 ? 'exam tomorrow' : c.examDays != null ? `exam in ${c.examDays} days` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

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
function courseTotals(course: Course, progress: Record<string, ItemResult>, now: number) {
  const exam = examRule(course, progress, now);
  let due = 0;
  let total = 0;
  let got = 0;
  let attempts = 0;
  for (const section of course.sections) {
    const stats = sectionStats(section, progress);
    total += stats.total;
    got += stats.got;
    attempts += stats.got + stats.missed;
    for (const { id } of scoredEntries(section.items)) if (isDueFor(progress[id], now, exam.forItem(id))) due++;
  }
  return { total, due, accuracy: attempts > 0 ? Math.round((got / attempts) * 100) : null };
}

/** "/" — the course library: upload, search/tag filter, open, and quietly-hidden delete-with-undo. */
export function LibraryRoute() {
  const courses = useCoursesStore((s) => s.courses);
  const allProgress = useProgressStore((s) => s.byCourse);
  // Due is judged as of opening the library; rendering must not read the clock.
  const [now] = useState(Date.now);
  const importCourse = useCoursesStore((s) => s.importCourse);
  const removeCourse = useCoursesStore((s) => s.removeCourse);
  const updateCourse = useCoursesStore((s) => s.updateCourse);
  const inputRef = useRef<HTMLInputElement>(null);
  const ids = Object.keys(courses);
  const minutesFor = usePlanStore((s) => s.minutesFor);
  const logs = useStudyLogStore((s) => s.byCourse);
  const pace = useMemo(() => measuredPace(logs), [logs]);
  // Only worth working out when there is a choice to make between courses.
  const todays = useMemo(
    () => (Object.keys(courses).length >= 2 ? todayAcrossCourses(courses, allProgress, now, minutesFor, pace) : []),
    [courses, allProgress, now, minutesFor, pace],
  );

  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [showTags, setShowTags] = useState(false);

  const allTags = useMemo(
    () => [...new Set(ids.flatMap((id) => courses[id].metadata.tags ?? []))].sort(),
    [ids, courses],
  );
  // A student's courses group by the class they belong to, not by topic
  // tags: five courses already carried twenty-odd tags, a wall that pushed
  // the list itself off a phone screen. Classes come first and stay short.
  const allClasses = useMemo(
    () => [...new Set(ids.map((id) => courses[id].metadata.course_code?.trim()).filter((c): c is string => !!c))].sort(),
    [ids, courses],
  );

  const isFiltering = search.trim() !== '' || selectedTags.size > 0 || selectedClass !== null;

  const filteredIds = ids.filter((id) => {
    const c = courses[id];
    const text = search.trim().toLowerCase();
    const haystack = [c.metadata.title, c.metadata.course_code, c.metadata.subject, ...(c.metadata.tags ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesText = !text || haystack.includes(text);
    const matchesTags = selectedTags.size === 0 || (c.metadata.tags ?? []).some((t) => selectedTags.has(t));
    const matchesClass = selectedClass === null || c.metadata.course_code?.trim() === selectedClass;
    return matchesText && matchesTags && matchesClass;
  });
  // Courses of one class sit together, in the order they were added.
  filteredIds.sort((a, b) => {
    const ca = courses[a].metadata.course_code?.trim() ?? '\uffff';
    const cb = courses[b].metadata.course_code?.trim() ?? '\uffff';
    return ca.localeCompare(cb);
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
    const had = new Set(Object.keys(useCoursesStore.getState().courses));
    const imported = await importCourse(file);
    // Read AFTER the await: importCourse reads the file first, so the write
    // it triggers has not happened by the time the call returns.
    const ok = writesLanded();
    if (!imported.ok) {
      toast(imported.error, { type: 'error' });
      return;
    }
    if (ok && imported.warning) {
      toast(imported.warning, { type: 'info', duration: 30000 });
    } else if (ok) {
      // Same title replaces the course in place (see addCourse): say so, since
      // a student re-uploading a fixed file wants to know it didn't duplicate.
      const title = imported.course.metadata.title || 'Course';
      toast(had.has(imported.id) ? `"${title}" updated. Your progress on it is kept.` : `"${title}" uploaded.`, { type: 'success' });
    } else {
      toast(STORAGE_FULL, { type: 'error', duration: 12000 });
    }
  };

  const handleDelete = (id: string, title: string) => {
    const courseSnapshot = courses[id];
    const progressSnapshot = useProgressStore.getState().getProgress(id);
    const bookmarkSnapshot = useResumeStore.getState().getBookmark(id);
    const logSnapshot = useStudyLogStore.getState().byCourse[id];
    removeCourse(id);
    useProgressStore.getState().removeCourseProgress(id);
    useResumeStore.getState().clear(id);
    useStudyLogStore.getState().clear(id);
    toast(`"${title}" removed from library.`, {
      type: 'info',
      actionLabel: 'Undo',
      onAction: () => {
        updateCourse(id, courseSnapshot);
        useProgressStore.setState((s) => ({ byCourse: { ...s.byCourse, [id]: progressSnapshot } }));
        useResumeStore.getState().restore(id, bookmarkSnapshot);
        if (logSnapshot) useStudyLogStore.setState((s) => ({ byCourse: { ...s.byCourse, [id]: logSnapshot } }));
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
          <p className="mt-6 text-small">
            Studied on another device?{' '}
            <RestoreButton className="tap-safe text-text-2 underline decoration-border-strong underline-offset-4 hover:text-text" label="Restore a backup" />
          </p>
        </div>
      ) : (
        <>
          {todays.length > 0 && (
            <div className="mb-7">
              <h2 className="mark mb-2 text-text-3">Today</h2>
              <ul className="border-y border-border">
                {todays.slice(0, TODAY_ROWS).map((c) => (
                  <li key={c.id} className="flex items-center gap-4 border-b border-border py-3 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <span className="block font-display text-body font-semibold leading-snug text-text">
                        {c.title}
                      </span>
                      <span className="block text-small text-text-2">{todayLine(c)}</span>
                    </div>
                    <Link to={`/session/${c.id}/today`} className="press press-ink tap-safe shrink-0">
                      Start
                    </Link>
                  </li>
                ))}
              </ul>
              {todays.length > TODAY_ROWS && (
                <p className="mt-2 text-small text-text-3">+{todays.length - TODAY_ROWS} more below</p>
              )}
            </div>
          )}
          {/* The apparatus of a contents page: a ruled line to write the
              search on, and the classes and tags set as index lines. Both used to
              be web furniture — a grey rounded search box and a row of
              filled pill chips — which is the look the page was trying to
              get away from. A selected entry is underscored, the way you
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
            {allClasses.length > 1 && (
              <IndexLine
                label="Classes"
                entries={allClasses}
                isActive={(c) => selectedClass === c}
                onToggle={(c) => setSelectedClass((prev) => (prev === c ? null : c))}
              />
            )}
            {allTags.length > 0 &&
              (showTags || selectedTags.size > 0 ? (
                <div className="space-y-2">
                  <IndexLine label="Tags" entries={allTags} isActive={(t) => selectedTags.has(t)} onToggle={toggleTag} />
                  <button
                    type="button"
                    onClick={() => {
                      setShowTags(false);
                      setSelectedTags(new Set());
                    }}
                    className="mark tap-safe text-text-3 hover:text-text"
                  >
                    {selectedTags.size > 0 ? 'Clear and hide tags' : 'Hide tags'} ◂
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTags(true)}
                  className="mark tap-safe text-text-3 hover:text-text"
                >
                  Tags ({allTags.length}) ▸
                </button>
              ))}
          </div>

          {filteredIds.length === 0 ? (
            <div className="border-y border-border py-12 text-center text-text-2">
              No matching courses. Try a different search, or clear the class or tag you picked.
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
                const stats = courseTotals(course, allProgress[id] ?? EMPTY_PROGRESS, now);
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
                        {/* The library's one line about today: which course has
                            something slipping. Opening the app should show
                            where to go before you have picked a course. */}
                        {stats.due > 0 && <span className="mark block text-text">{stats.due} due</span>}
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

/** A row of filter words set like an index line: a selected one is underscored, not filled in. */
function IndexLine({
  label,
  entries,
  isActive,
  onToggle,
}: {
  label: string;
  entries: string[];
  isActive: (entry: string) => boolean;
  onToggle: (entry: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2">
      <span className="mark mr-2 text-text-3">{label}</span>
      {entries.map((entry, i) => {
        const active = isActive(entry);
        return (
          <span key={entry} className="flex items-baseline">
            <button
              type="button"
              onClick={() => onToggle(entry)}
              aria-pressed={active}
              className={`tap-safe px-0.5 text-small transition-colors ${
                active
                  ? 'text-accent underline decoration-accent decoration-2 underline-offset-4'
                  : 'text-text-2 hover:text-text hover:underline hover:underline-offset-4'
              }`}
            >
              {entry}
            </button>
            {i < entries.length - 1 && <span className="ml-1 text-text-3">·</span>}
          </span>
        );
      })}
    </div>
  );
}
