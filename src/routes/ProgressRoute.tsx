import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sectionMemory } from '@/lib/sectionMemory';
import { sortedSections } from '@/lib/sortedSections';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { computeCourseStats, type StatRow } from '@/lib/computeCourseStats';
import { CourseTree } from '@/components/CourseTree';
import { examRule } from '@/lib/exam';
import { mixUps } from '@/lib/mixUps';
import { forecastDue } from '@/lib/forecast';
import { plural } from '@/lib/plural';
import { ThumbBar } from '@/components/ThumbBar';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';
import { useStudyLogStore } from '@/store/studyLog';
import { dayLine, heatmapWeeks, sumDays, summaryLine, timeStudied } from '@/lib/heatmap';
import { StudyHeatmap } from '@/components/StudyHeatmap';

/** The latest mix-ups shown; the rest are counted. */
const MIXUPS_SHOWN = 8;

/** Below this, a section is not solid yet. The one number the page is about. */
const SOLID = 80;

/**
 * One ranked row: the name on its own line, then the bar.
 *
 * The name used to share a line with the bar out of a 128px column, which
 * turned every section in a real course into "Linearising the …" — and the
 * only question this page exists to answer is WHICH section is weak.
 *
 * Bars are ink, not a traffic light. Accuracy here is a magnitude being
 * ranked, not a status being reported, and painting six rows in saturated
 * green and ochre made the largest coloured area in the app out of data that
 * is already sorted worst-first.
 *
 * A second pass then made the weak rows accent-blue, which was the same
 * mistake in one hue: twelve filled bars is still the largest painted region
 * on the page, and the rule this app works to is that the accent MARKS a
 * thing and never fills a region. So the bars are ink on a hairline now,
 * measured rules rather than coloured ones, and the ranking does the
 * pointing — the list is sorted worst-first and the figure is right there.
 * What is left of the emphasis is weight: a row below the solid mark is set
 * in full ink, a solid one recedes.
 */
function BarRow({ row }: { row: StatRow }) {
  const acc = row.acc ?? 0;
  const needsWork = acc < SOLID;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-small ${needsWork ? 'text-text' : 'text-text-2'}`}>{row.label}</span>
        <span className="shrink-0 whitespace-nowrap text-small tabular-nums text-text-2">
          {acc}% <span className="text-text-3">of {row.attempts} answers</span>
        </span>
      </div>
      <div className="relative mb-1 mt-2.5 h-px w-full bg-border">
        <div
          className={`h-px ${needsWork ? 'bg-text' : 'bg-text-3'}`}
          style={{ width: `${acc}%` }}
        />
        {/* Where "solid" starts, so the emphasis explains itself without a
            sentence underneath saying what it means. Drawn as a short tick
            crossing the rule rather than a dot sitting on it, the way a
            scale is marked. */}
        <div
          className="absolute -top-1 h-[7px] w-px bg-text-3"
          style={{ left: `${SOLID}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/**
 * One figure and what it counts.
 *
 * Four bordered tiles in a row is a dashboard's KPI strip, and it was the
 * last one left in the app. On a page that is otherwise ruled, a figure
 * needs no box around it — the rule above it and the space beside it are
 * enough to say where it starts and stops.
 */
function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="border-t border-border-strong pt-2">
      <div className="font-display text-title font-semibold tabular-nums text-text">{num}</div>
      <div className="mark mt-0.5 text-text-3">{label}</div>
    </div>
  );
}

/** "3 hours ago" beats a timestamp for the only question being asked of it. */
function ago(ts: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** "/study/:id/progress" — accuracy + weakest sections/tags, ported from the vanilla dashboard. */
export function ProgressRoute() {
  const { id } = useParams<{ id: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  // Both branches must return stable references — see EMPTY_PROGRESS.
  const progress = useProgressStore((s) => (id ? s.getProgress(id) : EMPTY_PROGRESS));
  // Fading is judged as of opening the page; rendering must not read the clock.
  const [now] = useState(Date.now);
  const wide = useMediaQuery(WIDE);
  const log = useStudyLogStore((s) => (id ? s.byCourse[id] : undefined));
  const [pickedDay, setPickedDay] = useState<string | null>(null);

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

  const stats = computeCourseStats(course, progress);

  if (stats.studiedCount === 0) {
    return (
      <div>
        {/* Top left, as on every page (it sat centred above the message). */}
        <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <div className="py-10 text-center">
          <h1 className="font-display text-title font-semibold text-text">No progress yet</h1>
          <p className="mt-2 text-text-2">
            Answer some questions, flashcards or terms in &ldquo;{course.metadata.title}&rdquo; and
            they will show up here.
          </p>
          <Link
            to={`/study/${id}`}
            className="press press-ink mt-4"
          >
            Back to lecture
          </Link>
        </div>
      </div>
    );
  }

  const mixed = mixUps(course, progress);
  const lastSeenText = stats.lastSeen ? `Last studied ${ago(stats.lastSeen)}.` : 'Not studied yet.';

  // What the tree draws, as figures: for each section studied, how much of
  // what it learned is still held, lowest first. Accuracy says how well you
  // answered; this says how much of it is still there, which is what decides
  // what to do next.
  const exam = examRule(course, progress, now);
  const fading = sortedSections(course)
    .map((section) => ({ section, m: sectionMemory(section, progress, now, exam) }))
    .filter(({ m }) => m.studied > 0)
    .map(({ section, m }) => ({ section, due: m.due, held: Math.round((m.learned ? m.held / m.learned : 1) * 100) }))
    .sort((a, b) => a.held - b.held || b.due - a.due);

  // Sections never studied: on a phone they were missing from the page, so
  // "5 not started" under the tree had nowhere to go.
  const notStarted = sortedSections(course)
    .map((section, n) => ({ section, n }))
    .filter(({ section }) => sectionMemory(section, progress, now, exam).studied === 0);
  const dueTotal = fading.reduce((n, f) => n + f.due, 0);
  const fadingCount = fading.filter((f) => f.due > 0).length;
  // What needs the student, said first and in words (docs/proposals/phone-round.md).
  const needs = [
    fadingCount > 0 ? `${plural(fadingCount, 'section')} fading, ${plural(dueTotal, 'question')} to review` : 'Nothing fading',
    notStarted.length > 0 ? `${notStarted.length} not started` : null,
  ]
    .filter(Boolean)
    .join('; ');

  const fadingBlock = (
    <>
      {fading.length > 0 && (
        <div className="mt-8">
          <h2 className="mark mb-1 text-text-3">Still remembered, weakest first</h2>
          {/* Each row is one tap to what it needs: review what is fading, or
              the section's page when nothing is due. */}
          <ul className="divide-y divide-border border-y border-border">
            {fading.map(({ section, due, held }) => (
              <li key={section.id}>
                <Link
                  to={
                    due > 0
                      ? `/session/${id}/review?section=${encodeURIComponent(section.id)}`
                      : `/study/${id}/section/${encodeURIComponent(section.id)}`
                  }
                  className="group tap-safe flex items-center gap-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className={`line-clamp-2 text-small ${due > 0 ? 'text-text' : 'text-text-2'} group-hover:text-accent`}>
                      {section.title}
                    </span>
                    {/* The share held sits at the end of its own bar: one
                        line per section, not two (the owner, 2026-11-27:
                        "is now the screen too scroll heavy"). */}
                    <span className="mt-1.5 flex items-center gap-2" aria-label={`${held}% still held`}>
                      <span className="relative block h-px flex-1 bg-border" aria-hidden="true">
                        <span className={`block h-px ${due > 0 ? 'bg-text' : 'bg-text-3'}`} style={{ width: `${held}%` }} />
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-text-3" aria-hidden="true">{held}%</span>
                    </span>
                  </span>
                  <span className={`shrink-0 whitespace-nowrap text-small tabular-nums ${due > 0 ? 'text-accent' : 'text-text-3'}`}>
                    {due > 0 ? `Review ${due}` : 'Holding'}
                  </span>
                  <span aria-hidden="true" className="shrink-0 font-display text-[1.5rem] leading-none text-text-3 group-hover:text-accent">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {notStarted.length > 0 && (
        <details className="group/ns mt-6" open={wide}>
          <summary className="tap-safe flex cursor-pointer list-none items-center gap-3 border-b border-border py-2.5">
            <span className="mark min-w-0 flex-1 text-text-3">Not started · {plural(notStarted.length, 'section')}</span>
            <span aria-hidden="true" className="shrink-0 font-display text-[1.5rem] leading-none text-text-3 transition-transform group-open/ns:rotate-90">
              ›
            </span>
          </summary>
          <ul className="divide-y divide-border border-b border-border">
            {notStarted.map(({ section, n }) => (
              <li key={section.id}>
                <Link
                  to={`/session/${id}/learn?section=${encodeURIComponent(section.id)}`}
                  className="group tap-safe flex items-center gap-3 py-3"
                >
                  <span className="mark w-6 shrink-0 text-right tabular-nums text-text-3">{n + 1}</span>
                  <span className="min-w-0 flex-1 text-small text-text-2 group-hover:text-accent">{section.title}</span>
                  <span className="shrink-0 text-small text-text-3">Learn</span>
                  <span aria-hidden="true" className="shrink-0 font-display text-[1.5rem] leading-none text-text-3 group-hover:text-accent">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
  const mixedBlock = (
    <>
      {mixed.length > 0 && (
        <div className="mt-8">
          <h2 className="mark mb-1 text-text-3">Mixed up</h2>
          <p className="mb-2 text-small text-text-2">
            Review asks these side by side.
          </p>
          <ul className="border-t border-border">
            {mixed.slice(0, MIXUPS_SHOWN).map((m) => (
              <li key={m.id} className="border-b border-border py-2.5 text-small">
                <span className="text-text">{m.asked}</span>
                <span className="text-text-2"> · you answered {m.with.join(', ')}</span>
              </li>
            ))}
          </ul>
          {mixed.length > MIXUPS_SHOWN && <p className="mt-1 text-xs text-text-3">and {mixed.length - MIXUPS_SHOWN} more</p>}
        </div>
      )}
    </>
  );
  const detBlock = (
    <>
      {/* How well it was answered, folded: it is the record of past answers,
          not what needs the student now, and the two "least accurate" lists
          name the same sections the list above already ranks. One line, and
          everything that was on the page is still here. */}
      <details className="group/acc mt-8 border-t border-border pt-3">
        <summary className="mark tap-safe inline-flex cursor-pointer list-none items-baseline text-text-3 hover:text-text">
          <span className="group-open/acc:hidden">How well you answered ▸</span>
          <span className="hidden group-open/acc:inline">How well you answered ▾</span>
        </summary>

        {/* 2-up on phones — four tiles at 375px wrapped labels and looked broken. */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat num={`${stats.accuracyPct ?? 0}%`} label="Accuracy" />
          <Stat num={String(stats.studiedCount)} label={`of ${stats.gradableCount} studied`} />
          <Stat num={String(stats.totalGot)} label="Correct" />
          <Stat num={String(stats.totalMissed)} label="Missed" />
        </div>

        {stats.weakestSections.length > 0 && (
          <div className="mt-8">
            <h2 className="mark mb-3 text-text-3">
              Least accurate sections
            </h2>
            <div className="space-y-3">
              {stats.weakestSections.map((row) => (
                <BarRow key={row.label} row={row} />
              ))}
            </div>
          </div>
        )}

        {stats.weakestTags.length > 0 && (
          <div className="mt-8">
            <h2 className="mark mb-3 text-text-3">
              Least accurate tags
            </h2>
            <div className="space-y-3">
              {stats.weakestTags.map((row) => (
                <BarRow key={row.label} row={row} />
              ))}
            </div>
          </div>
        )}
      </details>
    </>
  );
  const pracBlock = (
    <>
      {stats.weakestSections.length > 0 && (
        <Link
          to={`/session/${id}/weakest`}
          className={`group flex items-baseline justify-between gap-4 ${wide ? 'mt-8 border-y-2 border-text-3 py-4' : 'tap-safe mt-6 border-y border-border py-2.5'}`}
        >
          <span className={`font-display font-semibold text-text ${wide ? 'text-heading' : 'text-body'}`}>Practise the weakest</span>
          <span className="shrink-0 text-small text-text-2">every card, weakest first →</span>
        </Link>
      )}
    </>
  );

  // The right page on a computer: what comes due, and this lecture's days of study.
  const forecast = wide ? forecastDue(course, progress, now, exam) : [];
  const days = sumDays({ [id]: { days: log?.days ?? {} } });
  const weeks = wide ? heatmapWeeks(days, new Date(now), { maxWeeks: 26 }) : [];
  const daysLine = summaryLine(weeks) ?? 'No study in these weeks.';
  const dayCell = pickedDay ? weeks.flat().find((c) => c.date === pickedDay) : undefined;
  const totalSeconds = Object.values(days).reduce((n, d) => n + d.seconds, 0);
  const rightPage = (
    <>
      <h2 className="mark mb-1 text-text-3">Coming back to review</h2>
      <ul className="border-t border-border">
        {forecast.map((f) => (
          <li key={f.label} className="flex items-baseline gap-2 border-b border-border py-2 text-small">
            <span className={f.count ? 'text-text' : 'text-text-3'}>{f.label}</span>
            <span className="leaders" aria-hidden="true" />
            <span className="tabular-nums text-text-2">{f.count}</span>
          </li>
        ))}
      </ul>
      {totalSeconds > 0 && (
        <div className="mt-8">
          <h2 className="mark mb-3 text-text-3">Days of study in this lecture</h2>
          <StudyHeatmap weeks={weeks} label={daysLine} picked={pickedDay} setPicked={setPickedDay} />
          <p className="mt-2 text-small text-text-2" aria-live="polite">
            {dayCell ? dayLine(dayCell) : daysLine} {timeStudied(totalSeconds)} in all.
          </p>
        </div>
      )}
      {mixedBlock}
      {detBlock}
    </>
  );

  return (
    <div>
      <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← Back
      </Link>
      {/* On a phone the head is a few lines, so the list starts on the
          first screen: the page bar already says Progress, and the title
          at full size took half the screen (2026-11-27). */}
      <div className="mt-3 flex items-center gap-4 sm:mt-4 sm:items-start sm:gap-5">
        <CourseTree courseId={id} course={course} progress={progress} className="h-16 shrink-0 sm:h-36" />
        <div className="min-w-0 flex-1">
          <p className="mark hidden text-text-3 sm:block">Progress</p>
          <h1 className="font-display text-body font-semibold leading-snug text-text sm:mt-1 sm:text-display">
            {course.metadata.title}
          </h1>
          <p className="mt-1 text-xs text-text-3 sm:text-small">{lastSeenText}</p>
        </div>
      </div>
      <p className="mt-4 text-body text-text">{needs}.</p>

      {/* What is fading leads the page.
          It used to open with accuracy — four tiles of past answers — and
          then list the same sections three times over: recall now, accuracy,
          tags. Only the first of those says what needs the student now, which
          is the question this page is here to answer, so it comes first and
          the accuracy figures fold below it
          (docs/proposals/design-audit.md §3D). */}

      {wide ? (
        // Two facing pages: what is fading on the left, the rest on the right.
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,24rem)] gap-x-10">
          <div>
            {fadingBlock}
            {pracBlock}
          </div>
          <div className="border-l border-border pl-10 pt-8">{rightPage}</div>
        </div>
      ) : (
        <>
          {fadingBlock}
          {pracBlock}
          {mixedBlock}
          {detBlock}
          {/* What needs doing first, under the thumb however far the list
              runs: review what is fading, or practise the weakest. */}
          <div className="pb-24" />
          <ThumbBar>
            <div className="flex items-center gap-4">
              <span className="min-w-0 flex-1 text-small text-text-2">
                {dueTotal > 0 ? `${plural(dueTotal, 'question')} fading` : 'Nothing fading'}
              </span>
              <Link to={dueTotal > 0 ? `/session/${id}/review` : `/session/${id}/weakest`} className="press press-ink shrink-0 px-6 py-3">
                {dueTotal > 0 ? 'Review' : 'Practise the weakest'}
              </Link>
            </div>
          </ThumbBar>
        </>
      )}
    </div>
  );
}
