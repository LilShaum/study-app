import { useMemo, useState } from 'react';
import type { Course } from '@/schema/course';
import { analyseCourseHealth, findingGroup, type HealthFinding } from '@/lib/courseHealth';
import { optionsToRework } from '@/lib/evenOptions';
import { Icon } from './Icon';

interface CourseHealthPanelProps {
  course: Course;
  /** Opens the "fix what the check found" prompt. Omitted, the offer is hidden. */
  onFix?: () => void;
  /** Opens the small repair that only rewrites wrong options (lib/evenOptions.ts). */
  onEvenOut?: () => void;
}

/**
 * What the app can tell you about a lecture without seeing your notes.
 *
 * It leads with what changes your score or what you learn (`fix`), then what
 * only your slides can settle (`slides`), and folds the rest behind one line
 * (`minor`, lib/courseHealth.ts findingGroup). Every one of the owner's
 * lectures had findings, mostly minor ones, and a flat list of all of them
 * read as noise, so nothing got fixed. The one fault with its own cheap
 * repair, the right answer being the longest option, gets its own button.
 */
export function CourseHealthPanel({ course, onFix, onEvenOut }: CourseHealthPanelProps) {
  const health = useMemo(() => analyseCourseHealth(course), [course]);
  const rework = useMemo(() => optionsToRework(course).length, [course]);
  const [open, setOpen] = useState(false);
  const [showMinor, setShowMinor] = useState(false);

  const coverage = health.declaredTermCoverage;
  const shown = health.findings.filter((f) => !(f.id === 'declared-terms-missing' && coverage));
  const fix = shown.filter((f) => findingGroup(f) === 'fix');
  const slides = shown.filter((f) => findingGroup(f) === 'slides');
  const minor = shown.filter((f) => findingGroup(f) === 'minor');
  const missing = coverage?.missing.length ?? 0;
  const toCheck = slides.length + (missing > 0 ? 1 : 0);

  // Nothing to report and nothing to reassure with: stay out of the way.
  if (shown.length === 0 && !coverage) return null;

  const pct = coverage ? Math.round((coverage.covered / coverage.total) * 100) : null;
  const tone = health.problems > 0 ? 'text-error' : fix.length > 0 ? 'text-warning' : 'text-text-3';
  const summary = [
    fix.length > 0 && `${fix.length} to fix`,
    toCheck > 0 && `${toCheck} to check on your slides`,
    fix.length === 0 && toCheck === 0 && minor.length > 0 && `${minor.length} small note${minor.length === 1 ? '' : 's'}`,
  ].filter(Boolean);

  const item = (f: HealthFinding) => (
    <li key={f.id} className="flex gap-2">
      <span className={f.severity === 'problem' ? 'text-error' : 'text-text-3'}>•</span>
      <span className="text-text-2">
        {f.message}
        {f.id === 'length-tell' && onEvenOut && rework > 0 && (
          <>
            {' '}
            <button type="button" onClick={onEvenOut} className="tap-safe text-accent underline-offset-4 hover:underline">
              Even out the answers ({rework} question{rework === 1 ? '' : 's'})
            </button>
          </>
        )}
      </span>
    </li>
  );

  return (
    <div className="mt-4 border-b border-border text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2 py-2.5 text-left"
      >
        <span className={summary.length ? tone : 'text-success'}>
          <Icon name={health.problems > 0 ? 'x' : fix.length > 0 || toCheck > 0 ? 'bulb' : 'check-circle'} size={16} />
        </span>
        <span className="flex-1 text-text">
          {coverage && (
            <span className="font-medium">
              {coverage.covered} of {coverage.total} listed terms defined ({pct}%)
            </span>
          )}
          {coverage && summary.length > 0 && <span className="text-text-3"> · </span>}
          {summary.length > 0 && <span className={health.problems > 0 ? 'text-error' : 'text-text-2'}>{summary.join(', ')}</span>}
          {shown.length === 0 && coverage && <span className="text-text-2"> · nothing else to flag</span>}
        </span>
        <span className="text-text-3">
          <Icon name={open ? 'x' : 'plus'} size={14} />
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-2 py-3">
          {fix.length > 0 && (
            <section>
              <h3 className="mark mb-1.5 text-text-3">To fix</h3>
              <ul className="space-y-1.5">{fix.map(item)}</ul>
            </section>
          )}
          {(slides.length > 0 || missing > 0) && (
            <section>
              <h3 className="mark mb-1.5 text-text-3">Check on your slides</h3>
              <ul className="space-y-1.5">
                {missing > 0 && (
                  <li className="flex gap-2">
                    <span className="text-text-3">•</span>
                    <span className="text-text-2">
                      The generator listed these terms as being in your notes but never defined them:{' '}
                      <span className="text-text">{coverage!.missing.join(', ')}</span>.
                    </span>
                  </li>
                )}
                {slides.map(item)}
              </ul>
            </section>
          )}
          {minor.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowMinor((v) => !v)}
                aria-expanded={showMinor}
                className="tap-safe text-text-3 hover:text-text"
              >
                {showMinor ? 'Hide' : 'Show'} {minor.length} smaller note{minor.length === 1 ? '' : 's'}
              </button>
              {showMinor && (
                <>
                  <p className="mt-1.5 text-text-3">
                    None of these stops you studying. The app already never asks a term whose definition spells it
                    out, and keeps two cards on one fact apart.
                  </p>
                  <ul className="mt-1.5 space-y-1.5">{minor.map(item)}</ul>
                </>
              )}
            </section>
          )}
          {shown.length === 0 && <p className="text-text-2">No structural problems found.</p>}

          {/* The full round: everything the check found, back to the chat that
              wrote the lecture, which can see the notes. */}
          {onFix && shown.length > 0 && (
            <button type="button" onClick={onFix} className={`press mt-1 ${fix.length > 0 ? 'press-ink' : ''}`}>
              <Icon name="clipboard" size={14} />
              Send {fix.length > 0 ? 'these' : 'the notes'} to your AI to fix
            </button>
          )}
        </div>
      )}
    </div>
  );
}
