import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStudyLogStore } from '@/store/studyLog';
import { useCoursesStore } from '@/store/courses';
import { useMediaQuery } from '@/lib/useMediaQuery';
import {
  calendarMonths,
  dayLine,
  heatmapWeeks,
  studyStats,
  summaryLine,
  sumDays,
  timeByClass,
  timeStudied,
} from '@/lib/heatmap';
import { StudyHeatmap } from '@/components/StudyHeatmap';
import { StudyCalendar } from '@/components/StudyCalendar';

/**
 * The three looks shown to the owner side by side (docs/proposals/heatmap.md
 * §6), chosen by `?look=`, with no switch on the page: one is kept and the
 * others removed.
 */
const LOOKS = ['green', 'leaves', 'calendar'] as const;
type Look = (typeof LOOKS)[number];

/** Wide enough for a whole year of weeks at a readable size. */
const YEAR_WIDE = '(min-width: 640px)';

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/**
 * "#/days": the student's own record of study, for the whole library: the
 * grid, its line, four figures and the time by class. A page of its own, so
 * there is room for a year and it is the page to show someone ("to flex",
 * the owner, 2026-11-11), reached from a line on the library's first screen.
 */
export function DaysRoute() {
  const byCourse = useStudyLogStore((s) => s.byCourse);
  const courses = useCoursesStore((s) => s.courses);
  const [params] = useSearchParams();
  const asked = params.get('look');
  const look: Look = (LOOKS as readonly string[]).includes(asked ?? '') ? (asked as Look) : 'green';
  // A year on a desktop; on a phone, half a year, which fits its width
  // without scrolling sideways (a sideways strip hides its own start and
  // fights the swipe back) and covers a term and its exams.
  const wide = useMediaQuery(YEAR_WIDE);
  // The page is as of opening it; rendering must not read the clock.
  const [now] = useState(() => new Date());
  const [picked, setPicked] = useState<string | null>(null);

  const totals = useMemo(() => sumDays(byCourse), [byCourse]);
  const weeks = useMemo(() => heatmapWeeks(totals, now, { maxWeeks: wide ? 53 : 26 }), [totals, now, wide]);
  const summary = useMemo(() => summaryLine(weeks), [weeks]);
  const stats = useMemo(() => studyStats(totals, now), [totals, now]);
  const classes = useMemo(() => timeByClass(byCourse, courses), [byCourse, courses]);
  const months = useMemo(() => (look === 'calendar' ? calendarMonths(totals, now) : []), [look, totals, now]);

  const pickedCell = picked && look !== 'calendar' ? weeks.flat().find((c) => c.date === picked) : undefined;
  // Days studied only before the weeks shown: a student back after a long gap.
  const line = summary ?? `No study in these weeks; ${days(stats.days)} before them.`;

  return (
    <div>
      <Link to="/" className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← Library
      </Link>
      <h1 className="mt-3 font-display text-display font-semibold text-text">Days of study</h1>

      {!stats.days ? (
        // An empty grid reads as a record of failure: nothing until there is a day.
        <p className="mt-4 max-w-md text-body text-text-2">Your days of study will fill in here as you study.</p>
      ) : (
        <>
          {look === 'calendar' ? (
            <>
              {/* Months run long on a phone, so the line comes first; a
                  tapped day's line is under its own month. */}
              <p className="mt-4 text-small text-text-2">{line}</p>
              <div className="mt-6">
                <StudyCalendar months={months} picked={picked} setPicked={setPicked} />
              </div>
            </>
          ) : (
            <>
              <div className="mt-6">
                <StudyHeatmap weeks={weeks} look={look} label={line} picked={picked} setPicked={setPicked} />
              </div>
              <p className="mt-3 text-small text-text-2" aria-live="polite">
                {pickedCell ? dayLine(pickedCell) : line}
              </p>
            </>
          )}

          {/* Figures to look at, never a nudge: no "keep your streak" anywhere.
              Set as a specimen label's fields, ruled, not a row of tiles. */}
          <dl className="mt-8 max-w-sm border-y border-border py-2.5">
            {(
              [
                ['Time studied', timeStudied(stats.seconds)],
                ['Days studied', `${stats.days}`],
                ['Longest streak', days(stats.longest)],
                ['Current streak', days(stats.current)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-4 py-1">
                <dt className="w-[8.5rem] shrink-0 whitespace-nowrap text-micro uppercase tracking-wider text-text-3 [overflow-wrap:normal]">
                  {label}
                </dt>
                <dd className="font-display text-body tabular-nums text-text">{value}</dd>
              </div>
            ))}
          </dl>

          {classes.length > 0 && (
            <section className="mt-10 max-w-sm" aria-labelledby="days-by-class">
              <h2 id="days-by-class" className="mark text-text-3">
                Time by class
              </h2>
              <ul className="mt-2 border-t border-border">
                {classes.map((row) => (
                  <li key={`${row.kind}:${row.label}`} className="flex items-baseline gap-2 border-b border-border py-2">
                    <span className={`mark ${row.kind === 'class' ? 'text-text' : 'text-text-3'}`}>{row.label}</span>
                    <span className="leaders" aria-hidden="true" />
                    <span className="text-small tabular-nums text-text-2">{timeStudied(row.seconds)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
