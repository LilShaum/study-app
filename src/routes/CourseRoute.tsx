import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { PracticeKinds } from '@/components/PracticeKinds';
import { useCoursesStore } from '@/store/courses';
import type { Course } from '@/schema/course';
import { exportCourse } from '@/lib/exportCourse';
import { cloudError, hasSavedSignIn, shareCourse } from '@/lib/cloud';
import { sortedSections } from '@/lib/sortedSections';
import { sectionStats } from '@/lib/sectionStats';
import { scoredEntries } from '@/lib/scored';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { bookmarkResolves, useResumeStore } from '@/store/resume';
import { toast } from '@/store/toast';
import { Icon } from '@/components/Icon';
import { LectureTree } from '@/components/LectureTree';
import { ThumbBar } from '@/components/ThumbBar';
import { useListKeys } from '@/lib/useListKeys';
import { Sheet } from '@/components/Sheet';
import { SectionDetail } from '@/components/SectionDetail';
import { SpecimenLabel } from '@/components/SpecimenLabel';
import { AddToCourseDialog, type AddMode } from '@/components/AddToCourseDialog';
import { kindsOf } from '@/lib/makeKinds';
import { CourseHealthPanel } from '@/components/CourseHealthPanel';
import { analyseCourseHealth, findingGroup } from '@/lib/courseHealth';
import { CourseDetailsDialog } from '@/components/CourseDetailsDialog';
import { CATCH_UP_HOURS, isDueFor, missedThisSitting } from '@/lib/memory';
import { nextSectionToLearn } from '@/lib/nextToLearn';
import { examRule } from '@/lib/exam';
import { buildSessionItems } from '@/lib/buildSessionItems';
import { DEFAULT_MINUTES, PARTS } from '@/lib/today';
import { plannedMinutes, studiedToday, todaySitting } from '@/lib/todaySitting';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';
import { usePlanStore } from '@/store/plan';
import { measuredPace, useStudyLogStore } from '@/store/studyLog';
import { ExamDialog } from '@/components/ExamDialog';
import { notesFromAI } from '@/lib/notesFromAI';
import { runsOf, sourceCoverage } from '@/lib/sourceCoverage';
import { examLabel, ranges } from '@/lib/examLabel';
import { classOf, lectureExam } from '@/lib/classExams';
import { plural } from '@/lib/plural';

interface Counts {
  total: number;
  definition: number;
  explain: number;
  graphic: number;
  gradable: number;
  /** Studied items due for review now (see lib/memory.ts). */
  due: number;
  /** Scorable items answered at least once. */
  studied: number;
  accuracy: number | null;
}

/**
 * What a saved place is called on the Continue card. Every mode can still be
 * bookmarked and resumed, though only Learn and Practice are offered here.
 */
const MODE_LABELS: Record<string, string> = {
  learn: 'Learn',
  quiz: 'Multiple choice',
  flashcards: 'Flashcards',
  definitions: 'Terms',
  mixed: 'Everything',
  weakest: 'Weakest first',
  missed: 'Mistakes',
  review: 'Review',
  browse: 'Browse',
  today: 'Today',
};

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

/** A contents row: a link to the section's page, or on the desktop spread a button that opens it in place. */
function Row({
  to,
  onPick,
  onHover,
  className,
  children,
}: {
  to: string;
  onPick?: () => void;
  onHover?: (on: boolean) => void;
  className: string;
  children: ReactNode;
}) {
  return onPick ? (
    <button
      type="button"
      data-list-item
      onClick={onPick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={className}
    >
      {children}
    </button>
  ) : (
    <Link to={to} data-list-item className={className}>
      {children}
    </Link>
  );
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
  // Indexing straight into the map keeps the selector's return reference
  // stable — a getter that built an object would change the snapshot on every
  // store read (see EMPTY_PROGRESS for the render loop that causes).
  const bookmark = useResumeStore((s) => (id ? s.byCourse[id] : undefined));
  const clearBookmark = useResumeStore((s) => s.clear);
  const progress = useProgressStore((s) => (id ? s.getProgress(id) : EMPTY_PROGRESS));
  // What is due is judged as of opening the page: rendering must not read the
  // clock, and a count that shifted while you looked at it would be worse.
  const [now] = useState(Date.now);
  const nextUp = useMemo(() => (course ? nextSectionToLearn(course, progress, now) : null), [course, progress, now]);

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
      definition: byType('definition'),
      // Set-aside ones do not count: the lecture still lacks them.
      explain: items.filter((i) => i.type === 'explain' && !i.set_aside).length,
      graphic: byType('graphic'),
      gradable: gradableIds.length,
      studied,
      due: gradableIds.filter((itemId) => isDueFor(progress[itemId], now, exam?.forItem(itemId) ?? null)).length,
      accuracy: attempts > 0 ? Math.round((got / attempts) * 100) : null,
    };
  }, [course, progress, now]);

  // What the lecture check found to fix, said on the phone's More line so
  // folding the check away does not hide it (CourseHealthPanel's own rule).
  const healthNote = useMemo(() => {
    if (!course) return null;
    const health = analyseCourseHealth(course);
    const n = health.findings.filter(
      (f) => findingGroup(f) === 'fix' && !(f.id === 'declared-terms-missing' && health.declaredTermCoverage),
    ).length;
    return n > 0 ? `${n} to fix` : null;
  }, [course]);

  const wide = useMediaQuery(WIDE);
  // J and K through the sections (a computer's keyboard).
  useListKeys();
  // The picked section lives in the URL so Back un-picks it. Only the wide
  // layout reads it; on a phone a section is its own page.
  const [params, setParams] = useSearchParams();
  const pickedId = wide ? params.get('s') : null;
  const picked = course && pickedId ? course.sections.find((s) => s.id === pickedId) : undefined;
  // The row under the pointer lights its branch; otherwise the picked one.
  const [hovered, setHovered] = useState<string | null>(null);
  // On a phone a section opens as a sheet over the lecture, so the tree and
  // where you were stay underneath; its own page stays for links.
  const [sheetId, setSheetId] = useState<string | null>(null);
  const sheetSection = course && sheetId ? course.sections.find((s) => s.id === sheetId) : undefined;
  const pick = useCallback(
    (sid: string | null) =>
      setParams((p) => {
        const next = new URLSearchParams(p);
        if (sid) next.set('s', sid);
        else next.delete('s');
        return next;
      }),
    [setParams],
  );
  useEffect(() => {
    if (!picked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') pick(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, pick]);
  // The pinned Start on a phone shows only while Today's own Start cannot be
  // tapped: with both on screen it said the same thing twice and covered the
  // line under it. Watching the button and not its row, because the row now
  // lands at the foot of the first screen, where a sliver of it showing would
  // otherwise take the pinned Start away and leave no Start on screen at all.
  const [todayInView, setTodayInView] = useState(true);
  const todayObserver = useRef<IntersectionObserver | null>(null);
  const todayRef = useCallback((el: HTMLAnchorElement | null) => {
    todayObserver.current?.disconnect();
    if (!el || typeof IntersectionObserver === 'undefined') return;
    todayObserver.current = new IntersectionObserver(([entry]) => setTodayInView(entry.intersectionRatio > 0.9), { threshold: [0, 1] });
    todayObserver.current.observe(el);
  }, []);
  const [examOpen, setExamOpen] = useState(false);
  const ownMinutes = usePlanStore((s) => (id ? s.minutesFor(id) : DEFAULT_MINUTES));
  const total = usePlanStore((s) => s.total);
  // With one daily time for all courses, this course's share of it today.
  const minutes = useMemo(() => {
    void ownMinutes;
    void total;
    void progress;
    return id ? Math.round(plannedMinutes(id, now)) : DEFAULT_MINUTES;
  }, [id, now, ownMinutes, total, progress]);
  const logs = useStudyLogStore((s) => s.byCourse);
  const pace = useMemo(() => measuredPace(logs), [logs]);
  // "I have 15 minutes": the time the student picks for this sitting, or
  // null for what the plan gives. It changes the sitting itself (?min=),
  // not the plan, which Settings owns.
  const [chosen, setChosen] = useState<number | null>(null);
  /**
   * What pressing Today would give, said before it is pressed: how many
   * reviews, then where new material picks up. Built by the same call the
   * session makes, so the promise and the sitting cannot drift apart.
   */
  const today = useMemo(() => {
    if (!course || !id) return null;
    // What is left of the day's time once some is studied, or the short
    // catch-up after it (lib/todaySitting). `logs` and `minutes` are what it
    // reads, so they are what make this recompute.
    void logs;
    void minutes;
    const sitting = todaySitting(id, course, progress, now);
    const items = buildSessionItems(course, 'today', {
      progress,
      now,
      exam: examRule(course, progress, now),
      minutes: chosen ?? sitting.minutes,
      pace,
    });
    const review = items.filter((i) => i._block === 'review').length;
    const fresh = items.length - review;
    const firstNew = items.find((i) => i._block !== 'review');
    // A sitting is planned in whole steps and usually ends a little short of
    // its part, so a part counts as done at three quarters of its time.
    // Done for today: when the day's misses are worth one more look.
    const studied = studiedToday(id, now) > 0;
    const backAt = Object.values(progress)
      .filter((r) => missedThisSitting(r) && now - r.lastSeen! < CATCH_UP_HOURS * 3_600_000)
      .map((r) => r.lastSeen! + CATCH_UP_HOURS * 3_600_000);
    const catchUpAt = backAt.length && new Date(Math.min(...backAt)).toDateString() === new Date(now).toDateString() ? Math.min(...backAt) : null;
    return { review, fresh, firstNew, empty: items.length === 0, minutes: Math.round(chosen ?? sitting.minutes), planned: Math.round(sitting.minutes), catchUp: sitting.catchUp, part: sitting.part, partNo: sitting.part ? Math.min(PARTS, Math.floor(studiedToday(id, now) / 60 / sitting.part + 0.25) + 1) : 0, studied, catchUpAt, waiting: backAt.length };
  }, [course, id, progress, now, minutes, pace, logs, chosen]);

  // A bookmark outlives the item it points at — the item can be edited away,
  // the section deleted — so it is only offered when it still resolves. A
  // mixed class sitting's card can be in another lecture of the class.
  const bookmarkCourse = useCoursesStore((s) => (bookmark?.itemCourseId ? s.courses[bookmark.itemCourseId] : course));
  const resumable = bookmark && course && bookmarkCourse && bookmarkResolves(bookmarkCourse, bookmark) ? bookmark : null;

  if (!id) return <Navigate to="/" replace />;
  if (!course) {
    return (
      <div className="py-6 text-center text-text-2">
        Lecture not found.{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const tags = course.metadata.tags ?? [];
  const setAsideCount = course.sections.reduce((n, sec) => n + sec.items.filter((i) => i.set_aside).length, 0);
  const sectionsInOrder = sortedSections(course);
  const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const todaySummary =
    today?.empty && today.studied
      ? `Done for today.${
          today.catchUpAt
            ? ` ${today.waiting === 1 ? 'The one you missed is' : `The ${today.waiting} you missed are`} worth one more look after ${clock(today.catchUpAt)}: five minutes then makes them stick.`
            : ''
        }`
      : today?.catchUp
        ? `A second look: ${plural(today.review, 'question')} back to review since you studied, mostly ones you missed.`
        : !today || today.empty
      ? 'Nothing to review, and everything added so far has been studied. Add material after your next lecture.'
      : [
          today.review > 0 ? plural(today.review, 'question') + ' to review' : null,
          today.firstNew
            ? // How many, so picking a time shows what it changes.
              `${today.review > 0 ? 'then ' : ''}${plural(today.fresh, 'new card')}, starting at section ${sectionsInOrder.findIndex((s) => s.id === today.firstNew!._sectionId) + 1}, ${today.firstNew._sectionTitle}`
            : null,
        ]
          .filter(Boolean)
          .join(', ') + '.';
  // The exam this lecture is planned for now: its own, or the next class exam on it.
  const exam = lectureExam(course, now);
  // The last days before it, the day comes in parts (lib/today.ts, partMinutes).
  const partLine =
    today?.part != null && !today.catchUp && !today.empty
      ? `Close to the exam, ${PARTS === 3 ? 'three' : PARTS} sittings of about ${Math.round(today.part)} minutes a few hours apart do more than one long one.`
      : null;
  const classCode = classOf(course);
  const covered = exam.sections;
  const coverage = covered?.length
    ? `section${covered.length === 1 ? '' : 's'} ${ranges(
        covered.map((sid) => sectionsInOrder.findIndex((s) => s.id === sid) + 1).filter((n) => n > 0),
      )}`
    : 'every section';
  const examLine = exam.date
    ? `${exam.name ?? 'Exam'} ${examLabel(exam.date)}, on ${coverage} · Change`
    : 'Exam coming up? Add its date and what it covers';

  const todayLink = `/session/${id}/today${chosen ? `?min=${chosen}` : ''}`;

  const treeBlock = (
    <LectureTree
      courseId={id}
      course={course}
      progress={progress}
      wide={wide}
      onOpenSection={wide ? pick : setSheetId}
      highlight={wide ? (hovered ?? picked?.id ?? null) : null}
    />
  );
  const titleBlock = (
    <div className="min-w-0 flex-1">
      <h1 className="font-display text-display font-semibold text-text">{course.metadata.title}</h1>
      {/* The file's own details fold behind one line.
          Open, the description and the specimen label filled the first phone
          screen and pushed Today's Start to its foot — so the page every
          study day starts from opened with the code, the subject and the tag
          list rather than with studying (docs/proposals/design-audit.md §3C).
          They are one tap away, and the label inside is unchanged: the fields
          a herbarium sheet carries, not a sentence of statistics. */}
      <details className="group/about mt-3">
        <summary className="mark tap-safe inline-flex cursor-pointer list-none items-baseline text-text-3 hover:text-text">
          <span className="group-open/about:hidden">About this lecture ▸</span>
          <span className="hidden group-open/about:inline">About this lecture ▾</span>
        </summary>
        {/* What the whole lecture builds to: the thread that joins its
            sections (docs/proposals/narration.md). First inside the fold,
            since Learn already opens the lecture with it. */}
        {course.metadata.builds_to && <p className="mt-3 max-w-prose text-body text-text">{course.metadata.builds_to}</p>}
        {course.metadata.description && (
          <p className="mt-3 max-w-prose text-small text-text-2">{course.metadata.description}</p>
        )}
        {notesFromAI(course).length > 0 && (
          <div className="mt-3 max-w-prose text-small text-text-2">
            <div className="mark text-text-3">Notes from the AI</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {notesFromAI(course).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        <SpecimenLabel
          className="mt-3"
          rows={[
            { label: 'Code', value: course.metadata.course_code },
            { label: 'Subject', value: course.metadata.subject },
            { label: 'Exam', value: exam.date ? `${exam.name ? `${exam.name}, ` : ''}${examLabel(exam.date)}` : null },
            {
              label: 'Contents',
              value: `${counts.total} item${counts.total === 1 ? '' : 's'} in ${
                course.sections.length
              } section${course.sections.length === 1 ? '' : 's'}`,
            },
            // Every slide accounted for (lib/sourceCoverage): the one count
            // that says whether the lecture skipped part of the deck.
            { label: 'Slides', value: slidesLine(course) },
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
      </details>
    </div>
  );

  const tools = (
    <>
        {/* Two rows by purpose, each labelled. Seven links in one wrapping run
            broke into three ragged lines on a phone. The first row went
            unlabelled, and Diagrams in it read as a mode that had been left
            out of the list above; it is a page to look at, like Browse, and
            the label says so. No icons: every link here is a word, and a
            14px picture beside each word only added noise. */}
        <div className="space-y-4 text-small sm:space-y-1">
          <div className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-3">
            <span className="mark shrink-0 text-text-3 sm:w-16">View</span>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:gap-x-5">
              <ToolLink to={`/study/${id}/progress`}>Progress</ToolLink>
              <ToolLink to={`/session/${id}/browse`}>Browse and edit</ToolLink>
              {counts.definition > 0 && <ToolLink to={`/study/${id}/glossary`}>Glossary ({counts.definition})</ToolLink>}
              {/* Shown whenever anything is set aside, so a card set aside by
                  mistake is always one tap from coming back. */}
              {setAsideCount > 0 && <ToolLink to={`/study/${id}/set-aside`}>Set aside ({setAsideCount})</ToolLink>}
            </div>
          </div>
          <div className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-3">
            <span className="mark shrink-0 text-text-3 sm:w-16">Lecture</span>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:gap-x-5">
              <ToolButton onClick={() => setAdding('material')}>Add material</ToolButton>
              <ToolButton onClick={() => setAdding('practice')}>Add questions</ToolButton>
              {/* For a lecture made before explanations existed. */}
              {(counts.explain === 0 || !course.sections.some((s) => s.builds_to)) && kindsOf(course).includes('explain') && (
                <ToolButton onClick={() => setAdding('explain')}>Add explanations</ToolButton>
              )}
              <ToolButton onClick={() => setEditingDetails(true)}>Edit details</ToolButton>
              <ToolButton
                onClick={async () => {
                  if (await exportCourse(id, course)) toast('Lecture exported.', { type: 'success' });
                }}
              >
                Export
              </ToolButton>
              <ToolButton onClick={() => void share(course)}>Share</ToolButton>
            </div>
          </div>
        </div>
    </>
  );
  const main = (
    <>
      {wide && <CourseHealthPanel course={course} onFix={() => setAdding('fix')} onEvenOut={() => setAdding('options')} />}

      {resumable && (
        <div className="paper-grain mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-border-strong bg-surface-raised p-4 shadow">
          {/* basis: at a large text size the words wrapped one letter to a
              line beside the button; now the button drops below instead. */}
          <span className="min-w-0 flex-1 basis-52">
            <span className="block font-medium text-text">
              {MODE_LABELS[resumable.mode] ?? resumable.mode}
              {resumable.sectionId && (
                <span className="font-normal text-text-2">
                  {': '}
                  {course.sections.find((s) => s.id === resumable.sectionId)?.title}
                </span>
              )}
              {resumable.mixed && resumable.classCode && (
                <span className="font-normal text-text-2">: every lecture in {resumable.classCode}, mixed</span>
              )}
            </span>
            <span className="block text-small text-text-2">
              Item {resumable.index + 1} of {resumable.total}, {ago(resumable.updatedAt)}.
            </span>
          </span>
          <Link
            to={`/session/${id}/${resumable.mode}?resume=1${
              resumable.sectionId ? `&section=${encodeURIComponent(resumable.sectionId)}` : ''
            }${resumable.kind ? `&kind=${resumable.kind}` : ''}${resumable.study ? `&study=${encodeURIComponent(resumable.study)}` : ''}${
              resumable.practice ? `&p=${encodeURIComponent(resumable.practice)}` : ''
            }${
              resumable.classCode ? `&class=${encodeURIComponent(resumable.classCode)}${resumable.mixed && !resumable.single ? '&mix=1' : ''}` : ''
            }${resumable.single ? '&single=1' : ''}`}
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

      {/* Today leads, as the page's one block. It answers "what do I do
          now" (review what is fading, then carry on with new material) in
          words, sized to the time the student says they have, with one
          Start. The simulator found a student who simply presses it every
          day does better than one who works the page by hand
          (sim/FINDINGS.md). A phone round (docs/proposals/phone-round.md):
          it had been one row among twenty, "30 min" twice and no way to say
          "I have 15". */}
      <section aria-labelledby="today-h" className="mt-8 border-y-2 border-text-3 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="today-h" className="font-display text-heading font-semibold text-text">
            Today
          </h2>
          {!today?.empty && (today?.catchUp || today?.part != null) && (
            <span className="mark tabular-nums text-text-3">
              {today.catchUp ? 'catch-up' : `${today.partNo} of ${PARTS}`}
            </span>
          )}
        </div>
        <p className="mt-1 text-body text-text-2">{todaySummary}</p>
        {partLine && <p className="mt-1 text-small text-text-3">{partLine}</p>}
        {!today?.empty && today && (
          <>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className="text-small text-text-3">Time</span>
              <div role="radiogroup" aria-label="Time for this sitting" className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {/* The planned time and the usual three; a usual one within
                    two minutes of the plan gives way to it (29 and 30 side
                    by side read as a glitch). */}
                {[today.planned, ...[10, 15, 30].filter((m) => Math.abs(m - today.planned) > 2)]
                  .sort((a, b) => a - b)
                  .map((m) => {
                    const on = today.minutes === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setChosen(m === today.planned ? null : m)}
                        className={`tap-safe px-0.5 font-display text-body tabular-nums ${
                          on ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'text-text-2 hover:text-text'
                        }`}
                      >
                        {m} min
                      </button>
                    );
                  })}
              </div>
            </div>
            <Link ref={todayRef} to={todayLink} className="press press-ink mt-4 w-full py-3 sm:w-auto">
              Start · {today.minutes} min
            </Link>
          </>
        )}
        <button
          type="button"
          onClick={() => setExamOpen(true)}
          className="tap-safe mt-3 block text-left text-small text-text-3 underline-offset-4 hover:text-text hover:underline"
        >
          {examLine}
        </button>
      </section>

      {/* The other ways in, each saying what it is for (three with nothing
          to tell them apart was the owner's "idek know anymore",
          2026-10-26), set as rows you tap: black words on their own did
          not look tappable (the fresh-eyes review, 2026-11-27). */}
      <section aria-labelledby="ways-h" className="mt-8">
        <h2 id="ways-h" className="mark mb-1 text-text-3">
          Or choose
        </h2>
        <ul className="divide-y divide-border border-b border-border">
          {[
            {
              to: `/session/${id}/${nextUp ? `learn?section=${encodeURIComponent(nextUp.section.id)}` : 'learn'}`,
              label: 'Learn',
              unit: nextUp ? `section ${nextUp.index + 1}` : null,
              use: 'In the order it was taught, beside your notes.',
            },
            {
              // docs/proposals/zen.md: questions that keep coming, planned from where you are.
              to: `/session/${id}/adaptive`,
              label: 'Adaptive quiz',
              unit: counts.due > 0 ? `${counts.due} to review` : null,
              use: 'Questions keep coming, picked for where you need them.',
            },
            {
              to: `/study/${id}/practice`,
              label: 'Practice',
              unit: null,
              use: 'Pick the kinds, cards and sections, or a practice test.',
            },
            // The figures were only a word under More, and a student revising
            // from the pictures never found them (the fresh-eyes test, 2026-11-27).
            ...(counts.graphic > 0
              ? [
                  {
                    to: `/study/${id}/diagrams`,
                    label: 'Diagrams',
                    unit: `${counts.graphic}`,
                    use: 'The lecture\'s figures, to look at and work through.',
                  },
                ]
              : []),
          ].map((m) => (
            <li key={m.label}>
              <Link to={m.to} className="group tap-safe flex items-center gap-3 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-3">
                    <span className="font-display text-body font-semibold text-text group-hover:text-accent">{m.label}</span>
                    {m.unit && <span className="mark tabular-nums text-text-3">{m.unit}</span>}
                  </span>
                  <span className="mt-0.5 block text-small text-text-3">{m.use}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 font-display text-[1.75rem] leading-none text-text-2 group-hover:text-accent">
                  ›
                </span>
              </Link>
              {m.label === 'Practice' && (
                <div className="-mt-1 pb-3">
                  <PracticeKinds courseId={id} course={course} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* What you look at and what you do to the lecture, rather than with
          it. On a phone they fold under one line, with the lecture check,
          so the page leads with studying (docs/proposals/phone-round.md);
          the line says when the check found something to fix. On a
          computer there is room for them in view. */}
      {wide ? (
        <div className="mt-6">{tools}</div>
      ) : (
        <details className="group/more mt-2 border-b border-border">
          <summary className="tap-safe flex cursor-pointer list-none items-center gap-3 py-3.5">
            <span className="min-w-0 flex-1">
              <span className="font-display text-body text-text-2">More</span>
              <span className="mt-0.5 block text-small text-text-3">
                Progress, glossary; add to or share the lecture{healthNote ? ` · ${healthNote}` : ''}
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 font-display text-[1.75rem] leading-none text-text-3 transition-transform group-open/more:rotate-90">
              ›
            </span>
          </summary>
          <div className="pb-5">
            <CourseHealthPanel course={course} onFix={() => setAdding('fix')} onEvenOut={() => setAdding('options')} />
            <div className="mt-4">{tools}</div>
          </div>
        </details>
      )}
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
              <Row
                to={`/study/${id}/section/${encodeURIComponent(section.id)}`}
                onHover={wide ? (on) => setHovered(on ? section.id : null) : undefined}
                onPick={wide ? () => pick(picked?.id === section.id ? null : section.id) : () => setSheetId(section.id)}
                className="group tap-safe flex w-full items-baseline gap-3 py-3 text-left"
              >
                <span className="mark w-6 shrink-0 text-right tabular-nums text-text-3">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span
                      className={`font-display text-body font-medium group-hover:text-accent ${
                        picked?.id === section.id
                          ? 'text-accent underline decoration-accent decoration-2 underline-offset-4'
                          : 'text-text'
                      }`}
                    >
                      {section.title}
                    </span>
                    <span className="leaders hidden sm:block" aria-hidden="true" />
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  {/* How much is studied first, in words: "100% · 5 studied"
                      on a ten-item section read as finished (the fresh-eyes
                      review, 2026-11-27). */}
                  <span className="mark block text-text-2">
                    {stats.studied > 0
                      ? `${stats.studied} of ${stats.gradable} studied`
                      : `${section.items.length} item${section.items.length === 1 ? '' : 's'}`}
                  </span>
                  {/* Coloured only once there is enough to judge by: a green
                      100% from one answer read as mastered. */}
                  {stats.accuracy !== null && (
                    <span
                      className={`mark block ${
                        stats.studied < 3
                          ? 'text-text-3'
                          : stats.accuracy >= 80 ? 'text-success' : stats.accuracy >= 50 ? 'text-warning' : 'text-error'
                      }`}
                    >
                      {stats.accuracy}% right
                    </span>
                  )}
                </span>
              </Row>
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    // Room under the page on a phone for the pinned Start bar.
    <div className={wide ? '' : 'pb-24'}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="flex items-baseline gap-2 text-sm text-text-3">
          <Link to="/" className="tap-safe inline-flex items-center text-text-2 hover:text-text">
            ← Library
          </Link>
          {classCode && (
            <>
              <span aria-hidden="true">·</span>
              <Link to={`/class/${encodeURIComponent(classCode)}`} className="tap-safe inline-flex items-center text-text-2 hover:text-text">
                {classCode}
              </Link>
            </>
          )}
        </span>
      </div>

      {/* Two layouts, not one stretched. On a desktop the course page is
          where you look around, so it spreads into two columns: the tree
          large enough to point at without opening it, with the contents
          under it, and everything you do on the right — all of it on one
          screen. Text you read stays at reading width either way. */}
      {wide ? (
        // An open spread: contents on the left page, held in place as the
        // right page scrolls, with a gutter rule between. A picked section
        // opens beside the ways to study, or in their place where there is
        // no room for both.
        <div className="mt-6 flex gap-10">
          <aside className="sticky top-6 max-h-[calc(100vh-3rem)] w-[24rem] shrink-0 self-start overflow-y-auto [scrollbar-width:thin]">
            {treeBlock}
            <div className="mt-6">{contents}</div>
          </aside>
          <div className="min-w-0 flex-1 border-l border-border pl-10">
            {picked ? (
              // The title runs across the whole right page; under it the
              // ways to study and the section face each other. In one
              // narrow column the title broke over three lines.
              <>
              <div className="hidden xl:block">{titleBlock}</div>
              <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-10">
                <div className="hidden min-w-0 xl:block">
                  {main}
                </div>
                <section
                  aria-label={picked.title}
                  className="min-w-0 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:self-start xl:overflow-y-auto xl:[scrollbar-width:thin]"
                >
                  <div className="mb-3 flex items-baseline justify-between gap-4">
                    <button type="button" onClick={() => pick(null)} className="text-sm text-text-2 hover:text-text xl:hidden">
                      ← Ways to study
                    </button>
                    <button type="button" onClick={() => pick(null)} className="ml-auto text-sm text-text-3 hover:text-text">
                      Close
                    </button>
                  </div>
                  <SectionDetail courseId={id} course={course} section={picked} progress={progress} compact />
                </section>
              </div>
              </>
            ) : (
              <>
                {titleBlock}
                {main}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Column on a phone: beside the tree the title had a third of the
              width and broke over four lines. The tree is now a block of its
              own width either way (see treeBlock), so the title follows it
              down the page rather than sitting beside it. */}
          <div className="mt-4 flex flex-col items-start gap-3">
            {treeBlock}
            {titleBlock}
          </div>
          {main}
          {contents}
        </>
      )}

      {/* On a phone, Today's Start stays where a thumb is, however far the
          page has scrolled. */}
      {!wide && !today?.empty && !todayInView && (
        <ThumbBar>
          <div className="flex items-center gap-4">
            <span className="min-w-0 flex-1 truncate text-small text-text-2">
              <span className="font-display font-semibold text-text">Today</span> · {today?.minutes ?? minutes} min
            </span>
            <Link to={todayLink} className="press press-ink shrink-0">
              Start
            </Link>
          </div>
        </ThumbBar>
      )}

      {sheetSection && !wide && (
        <Sheet label={sheetSection.title} title={<span className="mark text-text-3">Section {course.sections.indexOf(sheetSection) + 1}</span>} onClose={() => setSheetId(null)}>
          <div className="px-5 pb-6 pt-4">
            <SectionDetail courseId={id} course={course} section={sheetSection} progress={progress} compact />
          </div>
        </Sheet>
      )}

      {examOpen && <ExamDialog courseId={id} course={course} onClose={() => setExamOpen(false)} />}


      {editingDetails && <CourseDetailsDialog courseId={id} course={course} onClose={() => setEditingDetails(false)} />}

      {adding && (
        <AddToCourseDialog courseId={id} course={course} initialMode={adding} onClose={() => setAdding(null)} />
      )}
    </div>
  );
}

/**
 * Makes a link a classmate can open to add this course. Needs a sign-in, so
 * the link has an owner who can take it down; opening one needs nothing.
 */
async function share(course: Course) {
  if (!hasSavedSignIn()) {
    toast('Sign in to share a lecture.', {
      type: 'info',
      actionLabel: 'Sign in',
      onAction: () => window.location.assign('#/settings?s=account'),
    });
    return;
  }
  try {
    const url = await shareCourse(course);
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    if (coarse && typeof navigator.share === 'function') {
      await navigator.share({ title: course.metadata.title, url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied. Anyone with it can add this lecture.', { type: 'success' });
    } catch {
      window.prompt('Copy this link:', url);
    }
  } catch (e) {
    toast(cloudError(e), { type: 'error' });
  }
}

/** "42 slides, all accounted for", or which ones nothing came from; null when the file does not say. */
function slidesLine(course: Course): string | null {
  const c = sourceCoverage(course);
  if (!c) return null;
  const units = `${c.count} ${c.unit}${c.count === 1 ? '' : 's'}`;
  if (!c.missing.length) return `${units}, all accounted for`;
  return `${units}, nothing from ${c.missing.length === 1 ? c.unit : `${c.unit}s`} ${runsOf(c.missing)}`;
}
