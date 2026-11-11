import type { Dispatch, SetStateAction } from 'react';
import { dayLine, monthLine, type CalendarMonth, type HeatCell } from '@/lib/heatmap';

const INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** A studied day's wash, and the ink its number is printed in (theme.css: paper on the deepest). */
const WASH = ['', 'bg-heat-1 text-text', 'bg-heat-2 text-text', 'bg-heat-3 text-text', 'bg-heat-4 text-bg'];

/**
 * L4: the days of study set like a printed calendar, a month at a time,
 * newest first so the month a student is in is on the first screen and
 * earlier ones are further down the page. Each studied day's number sits on
 * a green wash by time; today is outlined. A tapped day's line replaces its
 * month's own line under the month, where the tap was, rather than at the
 * foot of a long page.
 */
export function StudyCalendar({
  months,
  picked,
  setPicked,
}: {
  months: CalendarMonth[];
  picked: string | null;
  setPicked: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <div
      className="grid gap-x-10 gap-y-7 sm:grid-cols-2"
      data-look="calendar"
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setPicked(null);
      }}
    >
      {months.map((month) => {
        const cells = month.weeks.flat();
        const held = picked ? cells.find((c): c is HeatCell => c?.date === picked) : undefined;
        const line = monthLine(month);
        return (
          <section key={month.key} aria-label={month.name}>
            <h2 className="mark border-b border-border pb-1.5 text-text-2">{month.name}</h2>
            <div
              role="img"
              aria-label={`${month.name}: ${line ?? 'no study'}.`}
              className="mt-1.5 grid select-none grid-cols-7 gap-[2px] [-webkit-touch-callout:none]"
            >
              {INITIALS.map((d, i) => (
                <span key={`h${i}`} className="mark pb-1 text-center text-text-3">
                  {d}
                </span>
              ))}
              {cells.map((c, i) =>
                c ? (
                  <span
                    key={c.date}
                    data-date={c.date}
                    data-level={c.level}
                    aria-current={picked === c.date ? 'date' : undefined}
                    className={`flex h-8 items-center justify-center font-display text-small tabular-nums ${
                      c.level ? WASH[c.level] : c.future ? 'text-text-3' : 'text-text-2'
                    } ${c.today ? 'outline outline-[1.5px] -outline-offset-[1.5px] outline-accent' : ''} ${
                      // The day picked is underscored, as a choice is across the app.
                      picked === c.date ? 'underline decoration-2 underline-offset-4' : ''
                    }`}
                    onPointerEnter={(e) => {
                      if (!c.future && e.pointerType === 'mouse') setPicked(c.date);
                    }}
                    onPointerDown={(e) => {
                      if (c.future) return;
                      if (e.pointerType === 'mouse') setPicked(c.date);
                      else setPicked((h) => (h === c.date ? null : c.date));
                    }}
                  >
                    {Number(c.date.slice(8))}
                  </span>
                ) : (
                  <span key={`e${i}`} />
                ),
              )}
            </div>
            <p className={`mt-2 min-h-[1.55em] text-small ${held ? 'text-text-2' : 'text-text-3'}`} aria-live="polite">
              {held ? dayLine(held) : line}
            </p>
          </section>
        );
      })}
    </div>
  );
}
