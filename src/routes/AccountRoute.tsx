import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudyLogStore } from '@/store/studyLog';
import { useCoursesStore } from '@/store/courses';
import { pageName, useProfileStore } from '@/store/profile';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { dayLine, heatmapWeeks, studyStats, summaryLine, sumDays, timeByClass, timeStudied } from '@/lib/heatmap';
import { StudyHeatmap } from '@/components/StudyHeatmap';
import { BackupButton, RestoreButton } from '@/components/Backup';

/** Wide enough for a whole year of weeks at a readable size. */
const YEAR_WIDE = '(min-width: 640px)';

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/**
 * "#/account": the student's own page (docs/proposals/account.md), named for
 * them (the owner, 2026-11-11: "probably the users name … if not then just
 * account"). Their days of study as leaves (the owner's pick), the figures
 * and the time by class; then their account and their things. Friends are a
 * plan of their own, later. Reached from the foot of every page.
 */
export function AccountRoute() {
  const byCourse = useStudyLogStore((s) => s.byCourse);
  const courses = useCoursesStore((s) => s.courses);
  const name = useProfileStore((s) => s.name);
  // A year on a desktop; on a phone, half a year, which fits its width
  // without scrolling sideways and covers a term and its exams.
  const wide = useMediaQuery(YEAR_WIDE);
  // The page is as of opening it; rendering must not read the clock.
  const [now] = useState(() => new Date());
  const [picked, setPicked] = useState<string | null>(null);

  const totals = useMemo(() => sumDays(byCourse), [byCourse]);
  const weeks = useMemo(() => heatmapWeeks(totals, now, { maxWeeks: wide ? 53 : 26 }), [totals, now, wide]);
  const summary = useMemo(() => summaryLine(weeks), [weeks]);
  const stats = useMemo(() => studyStats(totals, now), [totals, now]);
  const classes = useMemo(() => timeByClass(byCourse, courses), [byCourse, courses]);

  const pickedCell = picked ? weeks.flat().find((c) => c.date === picked) : undefined;
  // Days studied only before the weeks shown: a student back after a long gap.
  const line = summary ?? `No study in these weeks; ${days(stats.days)} before them.`;

  return (
    <div>
      <Link to="/" className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← Library
      </Link>
      <h1 className="mt-3 font-display text-display font-semibold text-text">{pageName(name)}</h1>
      <NameField />

      <section className="mt-10" aria-labelledby="account-days">
        <h2 id="account-days" className="mark text-text-3">
          Days of study
        </h2>
        {!stats.days ? (
          // An empty grid reads as a record of failure: nothing until there is a day.
          <p className="mt-3 max-w-md text-body text-text-2">Your days of study will fill in here as you study.</p>
        ) : (
          <>
            <div className="mt-4">
              <StudyHeatmap weeks={weeks} label={line} picked={picked} setPicked={setPicked} />
            </div>
            <p className="mt-3 text-small text-text-2" aria-live="polite">
              {pickedCell ? dayLine(pickedCell) : line}
            </p>

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
              <div className="mt-8 max-w-sm">
                <h3 className="mark text-text-3">Time by class</h3>
                <ul className="mt-2 border-t border-border">
                  {classes.map((row) => (
                    <li key={`${row.kind}:${row.label}`} className="flex items-baseline gap-2 border-b border-border py-2">
                      <span className={`mark ${row.kind === 'class' ? 'text-text' : 'text-text-3'}`}>{row.label}</span>
                      <span className="leaders" aria-hidden="true" />
                      <span className="text-small tabular-nums text-text-2">{timeStudied(row.seconds)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      <section className="mt-12 max-w-md" aria-labelledby="account-sync">
        <h2 id="account-sync" className="mark text-text-3">
          Sync
        </h2>
        <p className="mt-2 text-small text-text-2">
          Sign in on each device you study on, and your lectures and progress follow you. Optional: without it,
          nothing leaves this device.
        </p>
        <Link to="/sync" className="press tap-safe mt-3">
          Sign in and sync
        </Link>
      </section>

      <section className="mt-10 max-w-md" aria-labelledby="account-backup">
        <h2 id="account-backup" className="mark text-text-3">
          Back up
        </h2>
        <p className="mt-2 text-small text-text-2">
          Every lecture, all your progress and your settings as one file, to keep or to restore on another device.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <BackupButton />
          <RestoreButton />
        </div>
      </section>
    </div>
  );
}

/** The name the page and its link carry: a ruled field, saved when you leave it. */
function NameField() {
  const name = useProfileStore((s) => s.name);
  const setName = useProfileStore((s) => s.setName);
  const [draft, setDraft] = useState(name);
  return (
    <label className="mt-2 flex max-w-xs items-baseline gap-3">
      <span className="mark shrink-0 text-text-3">Your name</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setName(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        maxLength={40}
        autoComplete="given-name"
        placeholder="so this page is yours"
        className="field min-w-0 flex-1 text-small"
      />
    </label>
  );
}
