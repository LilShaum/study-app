import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { exportCourse } from '@/lib/exportCourse';
import { sortedSections } from '@/lib/sortedSections';
import { sectionStats } from '@/lib/sectionStats';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { useResumeStore } from '@/store/resume';
import { toast } from '@/store/toast';
import { Icon, type IconName } from '@/components/Icon';
import { AddToCourseDialog, type AddMode } from '@/components/AddToCourseDialog';
import { CourseHealthPanel } from '@/components/CourseHealthPanel';
import { CourseDetailsDialog } from '@/components/CourseDetailsDialog';
import type { StudyMode } from '@/lib/buildSessionItems';

interface ModeCard {
  mode: StudyMode;
  label: string;
  desc: string;
  icon: IconName;
  /** How many items this mode would serve, for the count under the label. */
  count: (c: Counts) => number;
}

interface Counts {
  total: number;
  mcq: number;
  flashcard: number;
  definition: number;
  graphic: number;
  gradable: number;
  missed: number;
}

/**
 * Grouped by what the student is trying to do, not by item type.
 *
 * The flat six-tile grid this replaces made every mode look like an
 * alternative to every other, which is why Learn had nowhere to go: it isn't
 * a filter, it's the order you'd work through a section in.
 */
const MODE_GROUPS: { heading: string; blurb: string; modes: ModeCard[] }[] = [
  {
    heading: 'Learn it',
    blurb: 'Meet the material in teaching order — no AI needed, this is your own course resequenced.',
    modes: [
      {
        mode: 'learn',
        label: 'Learn',
        desc: 'Definitions and examples, then flashcards, then questions — one section at a time',
        icon: 'target',
        count: (c) => c.total,
      },
    ],
  },
  {
    heading: 'Practise it',
    blurb: 'Drill one kind of item, or take the lot.',
    modes: [
      { mode: 'quiz', label: 'Quiz', desc: 'MCQs one at a time', icon: 'help-circle', count: (c) => c.mcq },
      { mode: 'flashcards', label: 'Flashcards', desc: 'Flip & track recall', icon: 'layers', count: (c) => c.flashcard },
      { mode: 'definitions', label: 'Definitions', desc: 'Term → reveal', icon: 'file-text', count: (c) => c.definition },
      { mode: 'mixed', label: 'Mixed', desc: 'All types, shuffled', icon: 'shuffle', count: (c) => c.total },
    ],
  },
  {
    heading: 'Fix what is weak',
    blurb: 'Both read the score you have built up; only MCQs and flashcards are scored.',
    modes: [
      {
        mode: 'weakest',
        label: 'Weakest First',
        desc: 'Ranked by your accuracy, shakiest first',
        icon: 'bar-chart',
        count: (c) => c.gradable,
      },
      {
        mode: 'missed',
        label: 'Review Missed',
        desc: 'Only what you get wrong more than right',
        icon: 'repeat',
        count: (c) => c.missed,
      },
    ],
  },
  {
    heading: 'Read and edit it',
    blurb: 'The whole course as a feed — this is where you change or delete an item.',
    modes: [
      { mode: 'browse', label: 'Browse', desc: 'Read all content in order, edit anything', icon: 'book-open', count: (c) => c.total },
    ],
  },
];

const GRID_COLS: Record<number, string> = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

const MODE_LABELS: Record<string, string> = Object.fromEntries(
  MODE_GROUPS.flatMap((g) => g.modes.map((m) => [m.mode, m.label])),
);

/** "5 minutes ago" — precise enough to tell you whether this is today's work. */
function ago(ts: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** "/study/:id" — course overview + mode picker. */
export function CourseRoute() {
  const { id } = useParams<{ id: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  const [adding, setAdding] = useState<AddMode | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  // Indexing straight into the map keeps the selector's return reference
  // stable — a getter that built an object would change the snapshot on every
  // store read (see EMPTY_PROGRESS for the render loop that causes).
  const bookmark = useResumeStore((s) => (id ? s.byCourse[id] : undefined));
  const clearBookmark = useResumeStore((s) => s.clear);
  const progress = useProgressStore((s) => (id ? s.getProgress(id) : EMPTY_PROGRESS));

  const counts = useMemo<Counts>(() => {
    const items = course?.sections.flatMap((s) => s.items) ?? [];
    const byType = (type: string) => items.filter((i) => i.type === type).length;
    const gradableIds = items.filter((i) => i.type === 'mcq' || i.type === 'flashcard').map((i) => i.id);
    return {
      total: items.length,
      mcq: byType('mcq'),
      flashcard: byType('flashcard'),
      definition: byType('definition'),
      graphic: byType('graphic'),
      gradable: gradableIds.length,
      // Counted here rather than via progress.missedIds(), which builds a new
      // Set on every call and would change the store snapshot each render.
      missed: gradableIds.filter((itemId) => {
        const r = progress[itemId];
        return r && r.missed > r.got;
      }).length,
    };
  }, [course, progress]);

  // A bookmark outlives the item it points at — the item can be edited away,
  // the section deleted — so it is only offered when it still resolves.
  const resumable =
    bookmark &&
    course &&
    course.sections.some(
      (s) =>
        (bookmark.sectionId === null || s.id === bookmark.sectionId) &&
        s.items.some((i) => i.id === bookmark.itemId),
    )
      ? bookmark
      : null;

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

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link to="/" className="text-sm text-text-2 hover:text-text">
        ← Library
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-text">{course.metadata.title}</h1>
      {course.metadata.description && <p className="mt-1 text-text-2">{course.metadata.description}</p>}
      {(course.metadata.course_code || course.metadata.subject || course.metadata.tags?.length) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {course.metadata.course_code && (
            <span className="font-medium uppercase tracking-wide text-text-3">
              {course.metadata.course_code}
            </span>
          )}
          {course.metadata.subject && <span className="text-text-3">{course.metadata.subject}</span>}
          {course.metadata.tags?.map((tag) => (
            <span key={tag} className="rounded-full bg-accent-light px-2 py-0.5 text-accent">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Link to={`/study/${id}/progress`} className="text-sm text-accent hover:underline">
          View progress →
        </Link>
        <button
          type="button"
          onClick={() => {
            exportCourse(id, course);
            toast('Course exported.', { type: 'success' });
          }}
          className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text"
        >
          <Icon name="download" size={14} />
          Export .study.json
        </button>
        {counts.graphic > 0 && (
          <Link
            to={`/study/${id}/diagrams`}
            className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text"
          >
            <Icon name="layers" size={14} />
            Diagrams ({counts.graphic})
          </Link>
        )}
        <button
          type="button"
          onClick={() => setEditingDetails(true)}
          className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text"
        >
          <Icon name="edit" size={14} />
          Edit details
        </button>
        <button
          type="button"
          onClick={() => setAdding('material')}
          className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text"
        >
          <Icon name="plus" size={14} />
          Add material
        </button>
        <button
          type="button"
          onClick={() => setAdding('practice')}
          className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-text"
        >
          <Icon name="repeat" size={14} />
          More practice
        </button>
      </div>

      <CourseHealthPanel course={course} onFix={() => setAdding('fix')} />

      {resumable && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-accent-border bg-accent-light p-4">
          <span className="text-accent">
            <Icon name="repeat" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-text">
              Continue {MODE_LABELS[resumable.mode] ?? resumable.mode}
              {resumable.sectionId && (
                <span className="font-normal text-text-2">
                  {' '}
                  — {course.sections.find((s) => s.id === resumable.sectionId)?.title}
                </span>
              )}
            </span>
            <span className="block text-sm text-text-2">
              You stopped at item {resumable.index + 1} of {resumable.total}, {ago(resumable.updatedAt)}.
            </span>
          </span>
          <Link
            to={`/session/${id}/${resumable.mode}?resume=1${
              resumable.sectionId ? `&section=${encodeURIComponent(resumable.sectionId)}` : ''
            }`}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Continue
          </Link>
          <button
            type="button"
            onClick={() => clearBookmark(id)}
            aria-label="Forget where I left off"
            title="Forget where I left off"
            className="text-text-3 hover:text-text"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      <h2 className="mb-1 mt-6 text-sm font-semibold uppercase tracking-wide text-text-3">
        Choose a Study Mode
      </h2>
      <p className="mb-4 text-sm text-text-3">
        New here?{' '}
        <Link to="/help" className="text-accent hover:underline">
          What each mode does
        </Link>
        .
      </p>

      <div className="space-y-6">
        {MODE_GROUPS.map((group) => (
          <div key={group.heading}>
            <div className="mb-2">
              <div className="text-sm font-medium text-text">{group.heading}</div>
              <div className="text-xs text-text-3">{group.blurb}</div>
            </div>
            {/* Columns follow the group's size. A two-card group laid out on a
                four-column grid left each card a quarter of the row, which was
                narrow enough to break "Weakest First" across two lines. */}
            <div className={`grid gap-3 ${GRID_COLS[Math.min(group.modes.length, 4)]}`}>
              {group.modes.map((m) => {
                const n = m.count(counts);
                return (
                  <Link
                    key={m.mode}
                    to={`/session/${id}/${m.mode}`}
                    className="flex gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent-border"
                  >
                    <span className="mt-0.5 shrink-0 text-accent">
                      <Icon name={m.icon} size={22} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-text">
                        {m.label}
                        <span className="ml-2 whitespace-nowrap text-xs font-normal text-text-3">
                          {n} item{n === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="block text-sm text-text-2">{m.desc}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-text-3">
        Sections ({course.sections.length})
      </h2>
      <ul className="space-y-2">
        {sortedSections(course).map((section) => {
          const stats = sectionStats(section, progress);
          return (
            <li key={section.id}>
              <Link
                to={`/study/${id}/section/${encodeURIComponent(section.id)}`}
                className="flex items-center gap-3 rounded border border-border bg-surface px-4 py-2.5 transition-colors hover:border-accent-border"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-text">{section.title}</span>
                  <span className="block text-sm text-text-3">
                    {section.items.length} item{section.items.length === 1 ? '' : 's'}
                    {stats.accuracy !== null && (
                      <>
                        {' · '}
                        <span
                          className={
                            stats.accuracy >= 80
                              ? 'text-success'
                              : stats.accuracy >= 50
                                ? 'text-warning'
                                : 'text-error'
                          }
                        >
                          {stats.accuracy}%
                        </span>
                        <span className="text-text-3"> over {stats.studied} studied</span>
                      </>
                    )}
                  </span>
                </span>
                <span className="text-text-3" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {editingDetails && (
        <CourseDetailsDialog courseId={id} course={course} onClose={() => setEditingDetails(false)} />
      )}

      {adding && (
        <AddToCourseDialog
          courseId={id}
          course={course}
          initialMode={adding}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  );
}
