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
import { CourseTree } from '@/components/CourseTree';
import { SpecimenLabel } from '@/components/SpecimenLabel';
import { Fleuron } from '@/components/Fleuron';
import { TreeDialog } from '@/components/TreeDialog';
import { AddToCourseDialog, type AddMode } from '@/components/AddToCourseDialog';
import { CourseHealthPanel } from '@/components/CourseHealthPanel';
import { CourseDetailsDialog } from '@/components/CourseDetailsDialog';
import type { StudyMode } from '@/lib/buildSessionItems';

interface ModeCard {
  mode: StudyMode;
  label: string;
  desc?: string;
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
  accuracy: number | null;
}

/**
 * Learn leads, because it is the one mode that is a course rather than a
 * filter. It gets the whole width; the rest share a grid of identical tiles.
 *
 * The page used to group these under four headings — Learn, Practise, Review,
 * Browse — which put a heading above a single button and stacked "Study" over
 * "Learn" over "Learn". Six tiles do not need to be sorted into named bins.
 */
const LEARN: ModeCard = {
  mode: 'learn',
  label: 'Learn',
  desc: 'Definitions, then flashcards, then questions',
  icon: 'target',
  count: (c) => c.total,
};

/**
 * Label and count, nothing else. These carried a line of description each,
 * which left every tile a different height — two lines here, one there, three
 * where the text wrapped — and the grid read as ragged rather than as a set.
 * Six labels this plain do not need captioning.
 */
const PRACTICE: ModeCard[] = [
  { mode: 'quiz', label: 'Quiz', icon: 'help-circle', count: (c) => c.mcq },
  { mode: 'flashcards', label: 'Flashcards', icon: 'layers', count: (c) => c.flashcard },
  { mode: 'definitions', label: 'Definitions', icon: 'file-text', count: (c) => c.definition },
  { mode: 'mixed', label: 'Mixed', icon: 'shuffle', count: (c) => c.total },
  { mode: 'weakest', label: 'Weakest first', icon: 'bar-chart', count: (c) => c.gradable },
  { mode: 'missed', label: 'Review missed', icon: 'repeat', count: (c) => c.missed },
];

const MODE_LABELS: Record<string, string> = Object.fromEntries(
  [LEARN, ...PRACTICE, { mode: 'browse', label: 'Browse' }].map((m) => [m.mode, m.label]),
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

/** The small ink links under the header: things you do to a course, not with it. */
function ToolLink({ children, ...rest }: React.ComponentProps<typeof Link>) {
  return (
    <Link {...rest} className="tap-safe inline-flex items-center gap-1.5 text-text-2 hover:text-text">
      {children}
    </Link>
  );
}

function ToolButton({ children, ...rest }: React.ComponentProps<'button'>) {
  return (
    <button
      {...rest}
      type="button"
      className="tap-safe inline-flex items-center gap-1.5 text-text-2 hover:text-text"
    >
      {children}
    </button>
  );
}

/** "/study/:id" — course overview + mode picker. */
export function CourseRoute() {
  const { id } = useParams<{ id: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  const [adding, setAdding] = useState<AddMode | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
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
    let got = 0;
    let attempts = 0;
    for (const itemId of gradableIds) {
      const r = progress[itemId];
      if (!r) continue;
      got += r.got;
      attempts += r.got + r.missed;
    }
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
      accuracy: attempts > 0 ? Math.round((got / attempts) * 100) : null,
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

  const tags = course.metadata.tags ?? [];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link to="/" className="text-sm text-text-2 hover:text-text">
        ← Library
      </Link>

      {/* Column on a phone: beside the tree the title had a third of the width
          and broke over four lines. */}
      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:gap-8">
        <CourseTree
          courseId={id}
          course={course}
          progress={progress}
          className="h-28 sm:h-52 lg:h-64"
          interactive
          mode="preview"
          onExpand={() => setTreeOpen(true)}
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-display font-semibold text-text">{course.metadata.title}</h1>
          {course.metadata.description && (
            <p className="mt-2 line-clamp-3 max-w-prose text-small text-text-2 sm:line-clamp-none">
              {course.metadata.description}
            </p>
          )}
          {/* The code, the subject and the figures were a line of run-together
              small caps and a sentence of statistics. As a specimen label they
              are fields, which is what they are. */}
          <SpecimenLabel
            className="mt-4"
            rows={[
              { label: 'Code', value: course.metadata.course_code },
              { label: 'Subject', value: course.metadata.subject },
              {
                label: 'Contents',
                value: `${counts.total} item${counts.total === 1 ? '' : 's'} in ${
                  course.sections.length
                } section${course.sections.length === 1 ? '' : 's'}`,
              },
              {
                label: 'Studied',
                value:
                  counts.accuracy === null
                    ? 'Not yet'
                    : `${counts.accuracy}% correct over ${counts.gradable} scorable item${
                        counts.gradable === 1 ? '' : 's'
                      }`,
              },
              { label: 'Tags', value: tags.length ? tags.join(', ') : null },
            ]}
          />
        </div>
      </div>

      <CourseHealthPanel course={course} onFix={() => setAdding('fix')} />

      {resumable && (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-border-strong bg-surface-raised p-4 shadow">
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-text">
              {MODE_LABELS[resumable.mode] ?? resumable.mode}
              {resumable.sectionId && (
                <span className="font-normal text-text-2">
                  {' — '}
                  {course.sections.find((s) => s.id === resumable.sectionId)?.title}
                </span>
              )}
            </span>
            <span className="block text-small text-text-2">
              Item {resumable.index + 1} of {resumable.total}, {ago(resumable.updatedAt)}.
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
            className="tap-safe flex w-10 items-center justify-center text-text-3 hover:text-text"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      <Link
        to={`/session/${id}/${LEARN.mode}`}
        className="mt-8 block rounded border border-border-strong bg-surface-raised px-5 py-4 shadow transition-colors hover:bg-surface"
      >
        {/* The name and the count stay on one line at every width; only the
            description moves under them, so the tile never goes lopsided. */}
        <span className="flex items-center gap-4">
          <span className="shrink-0 text-text">
            <Icon name={LEARN.icon} size={24} />
          </span>
          <span className="min-w-0 flex-1 font-display text-heading font-semibold text-text">
            {LEARN.label}
          </span>
          <span className="shrink-0 whitespace-nowrap text-micro text-text-3">
            {LEARN.count(counts)} items
          </span>
        </span>
        <span className="mt-1 block text-small text-text-2 sm:pl-10">{LEARN.desc}</span>
      </Link>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRACTICE.map((m) => (
          <Link
            key={m.mode}
            to={`/session/${id}/${m.mode}`}
            className="flex items-center gap-3 rounded border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong"
          >
            <span className="shrink-0 text-text-3">
              <Icon name={m.icon} size={18} />
            </span>
            <span className="min-w-0 flex-1 font-medium text-text">{m.label}</span>
            <span className="shrink-0 whitespace-nowrap text-micro text-text-3">
              {m.count(counts)} items
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-3 text-small">
        <ToolLink to={`/study/${id}/progress`}>
          <Icon name="bar-chart" size={14} />
          Progress
        </ToolLink>
        <ToolLink to={`/session/${id}/browse`}>
          <Icon name="book-open" size={14} />
          Browse and edit
        </ToolLink>
        {counts.graphic > 0 && (
          <ToolLink to={`/study/${id}/diagrams`}>
            <Icon name="layers" size={14} />
            Diagrams ({counts.graphic})
          </ToolLink>
        )}
        <ToolButton onClick={() => setAdding('material')}>
          <Icon name="plus" size={14} />
          Add material
        </ToolButton>
        <ToolButton onClick={() => setAdding('practice')}>
          <Icon name="repeat" size={14} />
          More practice
        </ToolButton>
        <ToolButton onClick={() => setEditingDetails(true)}>
          <Icon name="edit" size={14} />
          Edit details
        </ToolButton>
        <ToolButton
          onClick={() => {
            exportCourse(id, course);
            toast('Course exported.', { type: 'success' });
          }}
        >
          <Icon name="download" size={14} />
          Export
        </ToolButton>
      </div>

      <Fleuron className="mt-10" />
      <h2 className="mb-3 mt-4 border-b-2 border-border-strong pb-1 font-display text-title font-semibold text-text">Sections</h2>
      {/* A list on paper is ruled rows, not eleven stacked boxes each with its
          own border and fill. */}
      <ul className="divide-y divide-border border-b border-border">
        {sortedSections(course).map((section) => {
          const stats = sectionStats(section, progress);
          return (
            <li key={section.id}>
              <Link
                to={`/study/${id}/section/${encodeURIComponent(section.id)}`}
                className="flex items-center gap-3 px-2 py-3 transition-colors hover:bg-surface"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-medium text-text">{section.title}</span>
                  <span className="block text-small text-text-3">
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

      {treeOpen && (
        <TreeDialog courseId={id} course={course} progress={progress} onClose={() => setTreeOpen(false)} />
      )}

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
