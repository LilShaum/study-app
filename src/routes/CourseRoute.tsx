import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { exportCourse } from '@/lib/exportCourse';
import { sortedSections } from '@/lib/sortedSections';
import { sectionStats } from '@/lib/sectionStats';
import { scoredEntries } from '@/lib/scored';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { bookmarkResolves, useResumeStore } from '@/store/resume';
import { toast } from '@/store/toast';
import { Icon } from '@/components/Icon';
import { CourseTree } from '@/components/CourseTree';
import { SpecimenLabel } from '@/components/SpecimenLabel';
import { TreeDialog } from '@/components/TreeDialog';
import { AddToCourseDialog, type AddMode } from '@/components/AddToCourseDialog';
import { CourseHealthPanel } from '@/components/CourseHealthPanel';
import { CourseDetailsDialog } from '@/components/CourseDetailsDialog';
import type { StudyMode } from '@/lib/buildSessionItems';
import { examTime, isDueFor } from '@/lib/memory';
import { nextSectionToLearn } from '@/lib/nextToLearn';
import { examRule } from '@/lib/exam';
import { buildSessionItems } from '@/lib/buildSessionItems';
import { DEFAULT_MINUTES } from '@/lib/today';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';
import { usePlanStore } from '@/store/plan';
import { measuredPace, useStudyLogStore } from '@/store/studyLog';
import { ExamDialog } from '@/components/ExamDialog';

interface ModeCard {
  mode: StudyMode;
  label: string;
  desc?: string;
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
  /** Studied items due for review now (see lib/memory.ts). */
  due: number;
  /** Scorable items answered at least once. */
  studied: number;
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
  desc: 'A few terms at a time: read them, recall them, then answer questions on them',
  // Every item, plus the typed-recall question each definition adds.
  count: (c) => c.total + c.definition,
};

/**
 * Label and count, nothing else. These carried a line of description each,
 * which left every tile a different height — two lines here, one there, three
 * where the text wrapped — and the grid read as ragged rather than as a set.
 * Six labels this plain do not need captioning.
 */
const PRACTICE: ModeCard[] = [
  { mode: 'quiz', label: 'Quiz', count: (c) => c.mcq },
  { mode: 'flashcards', label: 'Flashcards', count: (c) => c.flashcard },
  { mode: 'definitions', label: 'Terms', count: (c) => c.definition },
  { mode: 'mixed', label: 'Mixed', count: (c) => c.total },
  { mode: 'weakest', label: 'Weakest first', count: (c) => c.gradable },
  { mode: 'missed', label: 'Review missed', count: (c) => c.missed },
];

const MODE_LABELS: Record<string, string> = Object.fromEntries(
  [LEARN, ...PRACTICE, { mode: 'browse', label: 'Browse' }, { mode: 'review', label: 'Review' }].map((m) => [
    m.mode,
    m.label,
  ]),
);

/** 1,2,3,5,7,8 → "1–3, 5, 7–8". */
function ranges(numbers: number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    out.push(j > i ? `${sorted[i]}–${sorted[j]}` : `${sorted[i]}`);
    i = j;
  }
  return out.join(', ');
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "Thu 12 Nov · in 48 days" — the date and the distance, which is the part that matters. */
function examLabel(date: string | undefined): string | null {
  const at = examTime(date);
  if (at == null) return null;
  const day = new Date(at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(at);
  exam.setHours(0, 0, 0, 0);
  const days = Math.round((exam.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `${day} · passed`;
  if (days === 0) return `${day} · today`;
  if (days === 1) return `${day} · tomorrow`;
  return `${day} · in ${days} days`;
}

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
    <button {...rest} type="button" className="tap-safe inline-flex items-center gap-1.5 text-text-2 hover:text-text">
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
  const nextUp = useMemo(() => (course ? nextSectionToLearn(course, progress) : null), [course, progress]);
  // What is due is judged as of opening the page: rendering must not read the
  // clock, and a count that shifted while you looked at it would be worse.
  const [now] = useState(Date.now);

  const counts = useMemo<Counts>(() => {
    const items = course?.sections.flatMap((s) => s.items) ?? [];
    const byType = (type: string) => items.filter((i) => i.type === type).length;
    const gradableIds = scoredEntries(items).map((e) => e.id);
    const exam = course ? examRule(course, progress, now) : null;
    let got = 0;
    let attempts = 0;
    let studied = 0;
    for (const itemId of gradableIds) {
      const r = progress[itemId];
      if (!r) continue;
      if (r.got + r.missed > 0) studied++;
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
      studied,
      due: gradableIds.filter((itemId) => isDueFor(progress[itemId], now, exam?.forItem(itemId) ?? null)).length,
      accuracy: attempts > 0 ? Math.round((got / attempts) * 100) : null,
    };
  }, [course, progress, now]);

  const wide = useMediaQuery(WIDE);
  // The pinned Start on a phone shows only once Today itself has scrolled
  // away: with both on screen it said the same thing twice and covered the
  // line under it.
  const [todayInView, setTodayInView] = useState(true);
  const todayObserver = useRef<IntersectionObserver | null>(null);
  const todayRef = useCallback((el: HTMLLIElement | null) => {
    todayObserver.current?.disconnect();
    if (!el || typeof IntersectionObserver === 'undefined') return;
    todayObserver.current = new IntersectionObserver(([entry]) => setTodayInView(entry.isIntersecting));
    todayObserver.current.observe(el);
  }, []);
  const [examOpen, setExamOpen] = useState(false);
  const minutes = usePlanStore((s) => (id ? s.minutesFor(id) : DEFAULT_MINUTES));
  const logs = useStudyLogStore((s) => s.byCourse);
  const pace = useMemo(() => measuredPace(logs), [logs]);
  /**
   * What pressing Today would give, said before it is pressed: how many
   * reviews, then where new material picks up. Built by the same call the
   * session makes, so the promise and the sitting cannot drift apart.
   */
  const today = useMemo(() => {
    if (!course) return null;
    const items = buildSessionItems(course, 'today', {
      progress,
      now,
      exam: examRule(course, progress, now),
      minutes,
      pace,
    });
    const review = items.filter((i) => i._block === 'review').length;
    const firstNew = items.find((i) => i._block !== 'review');
    return { review, firstNew, empty: items.length === 0 };
  }, [course, progress, now, minutes, pace]);

  // A bookmark outlives the item it points at — the item can be edited away,
  // the section deleted — so it is only offered when it still resolves.
  const resumable = bookmark && course && bookmarkResolves(course, bookmark) ? bookmark : null;

  if (!id) return <Navigate to="/" replace />;
  if (!course) {
    return (
      <div className="py-6 text-center text-text-2">
        Course not found.{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const tags = course.metadata.tags ?? [];
  const sectionsInOrder = sortedSections(course);
  const todaySummary =
    !today || today.empty
      ? 'Nothing is due, and everything added so far has been studied. Add material after your next lecture.'
      : [
          today.review > 0 ? plural(today.review, 'card') + ' to review' : null,
          today.firstNew
            ? `${today.review > 0 ? 'then new' : 'New'}: section ${sectionsInOrder.findIndex((s) => s.id === today.firstNew!._sectionId) + 1}, ${today.firstNew._sectionTitle}`
            : null,
        ]
          .filter(Boolean)
          .join(', ');
  const covered = course.metadata.exam_sections;
  const coverage = covered?.length
    ? `section${covered.length === 1 ? '' : 's'} ${ranges(
        covered.map((sid) => sectionsInOrder.findIndex((s) => s.id === sid) + 1).filter((n) => n > 0),
      )}`
    : 'every section';
  const examLine = course.metadata.exam_date
    ? `Exam ${examLabel(course.metadata.exam_date)}, on ${coverage} · Change`
    : 'Exam coming up? Add its date and what it covers';

  const tree = (
    <CourseTree
      courseId={id}
      course={course}
      progress={progress}
      className={wide ? 'h-[26rem] w-full' : 'h-28 sm:h-52'}
      interactive
      mode="preview"
      onExpand={() => setTreeOpen(true)}
    />
  );
  const titleBlock = (
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
          { label: 'Exam', value: examLabel(course.metadata.exam_date) },
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
                : // "over 474 scorable items" read as though all 474 had
                  // been studied, when the accuracy covers only those
                  // that have.
                  `${counts.accuracy}% correct · ${counts.studied} of ${counts.gradable} studied`,
          },
          { label: 'Tags', value: tags.length ? tags.join(', ') : null },
        ]}
      />
    </div>
  );

  const main = (
    <>
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
            className="press press-ink"
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

      {/* The ways to work, set as an index rather than a tile grid.
          This was a big shadowed card over a 3x2 grid of smaller shadowed
          cards — the most dashboard-looking block in the app, and on the
          page you see most. As ruled entries with the counts in a right-hand
          column it reads as part of the same book as the library's contents
          list, and the counts line up so you can actually compare them,

      {/* The ways to work, set as an index rather than a tile grid: ruled
          entries with the counts in a right-hand column, the same book as
          the library's contents list.

          Today leads. It is the one entry that answers "what should I do
          now" — review what is fading, then carry on with new material,
          sized to the time the student has — and the simulator found a
          student who simply presses it every day does better than one who
          works the course page by hand (sim/FINDINGS.md). The modes under
          it are for choosing yourself. */}
      <section className="mt-8">
        <h2 className="mark mb-2 text-text-3">Ways to work</h2>
        <ul className="border-t border-border">
          <li ref={todayRef} className="border-b-2 border-text-3 py-4">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <span className="flex items-baseline gap-3">
                  <span className="font-display text-heading font-semibold text-text">Today</span>
                  <span className="mark tabular-nums text-text-2">{minutes} min</span>
                </span>
                <span className="mt-0.5 block text-small text-text-2">{todaySummary}</span>
                <button
                  type="button"
                  onClick={() => setExamOpen(true)}
                  className="tap-safe mt-1 text-left text-small text-text-3 underline-offset-4 hover:text-text hover:underline"
                >
                  {examLine}
                </button>
              </div>
              {!today?.empty && (
                <Link to={`/session/${id}/today`} className="press press-ink shrink-0">
                  Start
                </Link>
              )}
            </div>
          </li>
          {[
            ...(counts.due > 0 ? [{ mode: 'review', label: 'Review', unit: `${counts.due} due` }] : []),
            {
              mode: nextUp ? `learn?section=${encodeURIComponent(nextUp.section.id)}` : LEARN.mode,
              label: 'Learn',
              unit: nextUp ? `section ${nextUp.index + 1}` : plural(LEARN.count(counts), 'item'),
            },
            ...PRACTICE.filter((m) => m.mode !== 'missed' || counts.missed > 0).map((m) => ({
              mode: m.mode,
              label: m.label,
              unit: plural(m.count(counts), 'item'),
            })),
          ].map((m) => (
            <li key={m.label} className="border-b border-border">
              <Link to={`/session/${id}/${m.mode}`} className="group tap-safe flex items-baseline gap-3 py-3">
                <span className="font-display text-body text-text group-hover:text-accent">{m.label}</span>
                <span className="leaders hidden sm:block" aria-hidden="true" />
                <span className="mark shrink-0 tabular-nums text-text-3">{m.unit}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Two rows by purpose, each labelled. Seven links in one wrapping run
          broke into three ragged lines on a phone. The first row went
          unlabelled, and Diagrams in it read as a mode that had been left
          out of the list above; it is a page to look at, like Browse, and
          the label says so. No icons: every link here is a word, and a
          14px picture beside each word only added noise. */}
      <div className="mt-6 space-y-1 text-small">
        <div className="flex items-baseline gap-x-3">
          <span className="mark w-16 shrink-0 text-text-3">View</span>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <ToolLink to={`/study/${id}/progress`}>Progress</ToolLink>
            <ToolLink to={`/session/${id}/browse`}>Browse and edit</ToolLink>
            {counts.graphic > 0 && <ToolLink to={`/study/${id}/diagrams`}>Diagrams ({counts.graphic})</ToolLink>}
          </div>
        </div>
        <div className="flex items-baseline gap-x-3">
          <span className="mark w-16 shrink-0 text-text-3">Course</span>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <ToolButton onClick={() => setAdding('material')}>Add material</ToolButton>
            <ToolButton onClick={() => setAdding('practice')}>More practice</ToolButton>
            <ToolButton onClick={() => setEditingDetails(true)}>Edit details</ToolButton>
            <ToolButton
              onClick={() => {
                exportCourse(id, course);
                toast('Course exported.', { type: 'success' });
              }}
            >
              Export
            </ToolButton>
          </div>
        </div>
      </div>
    </>
  );
  const contents = (
    <>
      {/* No ornament above this heading. A single leaf used to sit here as a
          printer's fleuron; at 18px it read as a stray "0", and the heavy
          rule under the heading already marks where the contents begin. */}
      <h2 className="mb-3 mt-12 border-b-2 border-border-strong pb-1 font-display text-title font-semibold text-text">
        Sections
      </h2>
      {/* The course's own contents list, set the way the library's is: the
          section's place in the work on the left, the figures in a column on
          the right, and leaders carrying the eye between them. Numbered
          because the sections ARE ordered — it is the order the tree grows
          its branches in and the order Learn serves them. */}
      <ul className="divide-y divide-border border-b border-border">
        {sortedSections(course).map((section, index) => {
          const stats = sectionStats(section, progress);
          return (
            <li key={section.id}>
              <Link
                to={`/study/${id}/section/${encodeURIComponent(section.id)}`}
                className="group tap-safe flex items-baseline gap-3 py-3"
              >
                <span className="mark w-6 shrink-0 text-right tabular-nums text-text-3">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-body font-medium text-text group-hover:text-accent">
                      {section.title}
                    </span>
                    <span className="leaders hidden sm:block" aria-hidden="true" />
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="mark block text-text-2">
                    {section.items.length} item{section.items.length === 1 ? '' : 's'}
                  </span>
                  {stats.accuracy !== null && (
                    <span className="mark block">
                      <span
                        className={
                          stats.accuracy >= 80 ? 'text-success' : stats.accuracy >= 50 ? 'text-warning' : 'text-error'
                        }
                      >
                        {stats.accuracy}%
                      </span>
                      <span className="text-text-3"> · {stats.studied} studied</span>
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    // Room under the page on a phone for the pinned Start bar.
    <div className={wide ? '' : 'pb-20 sm:pb-0'}>
      <Link to="/" className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← Library
      </Link>

      {/* Two layouts, not one stretched. On a desktop the course page is
          where you look around, so it spreads into two columns: the tree
          large enough to point at without opening it, with the contents
          under it, and everything you do on the right — all of it on one
          screen. Text you read stays at reading width either way. */}
      {wide ? (
        <div className="mt-6 grid grid-cols-[22rem_minmax(0,1fr)] gap-12">
          <aside>
            {tree}
            <div className="mt-6">{contents}</div>
          </aside>
          <div>
            {titleBlock}
            {main}
          </div>
        </div>
      ) : (
        <>
          {/* Column on a phone: beside the tree the title had a third of the
              width and broke over four lines. */}
          <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:gap-8">
            {tree}
            {titleBlock}
          </div>
          {main}
          {contents}
        </>
      )}

      {/* On a phone, Today's Start stays where a thumb is, however far the
          page has scrolled. */}
      {!wide && !today?.empty && !todayInView && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-strong bg-bg/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
          <div className="flex items-center gap-4">
            <span className="min-w-0 flex-1 truncate text-small text-text-2">
              <span className="font-display font-semibold text-text">Today</span> · {minutes} min
            </span>
            <Link to={`/session/${id}/today`} className="press press-ink shrink-0">
              Start
            </Link>
          </div>
        </div>
      )}

      {examOpen && <ExamDialog courseId={id} course={course} onClose={() => setExamOpen(false)} />}

      {treeOpen && <TreeDialog courseId={id} course={course} progress={progress} onClose={() => setTreeOpen(false)} />}

      {editingDetails && <CourseDetailsDialog courseId={id} course={course} onClose={() => setEditingDetails(false)} />}

      {adding && (
        <AddToCourseDialog courseId={id} course={course} initialMode={adding} onClose={() => setAdding(null)} />
      )}
    </div>
  );
}
