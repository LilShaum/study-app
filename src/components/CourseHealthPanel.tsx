import { useMemo, useState } from 'react';
import type { Course } from '@/schema/course';
import { analyseCourseHealth } from '@/lib/courseHealth';
import { Icon } from './Icon';

interface CourseHealthPanelProps {
  course: Course;
  /** Opens the "fix what the check found" prompt. Omitted, the offer is hidden. */
  onFix?: () => void;
}

/**
 * What the app can tell you about a course without seeing your original notes.
 *
 * Collapsed to a single line when there is nothing wrong, because a clean
 * course should not be shouted at. The one number worth surfacing either way
 * is coverage against the generator's own declared term list — that is the
 * closest the app can get to "did it cover my whole lecture?" without the
 * lecture.
 */
export function CourseHealthPanel({ course, onFix }: CourseHealthPanelProps) {
  const health = useMemo(() => analyseCourseHealth(course), [course]);
  const [open, setOpen] = useState(false);

  const coverage = health.declaredTermCoverage;
  const clean = health.findings.length === 0;

  // Nothing to report and nothing to reassure with — stay out of the way.
  if (clean && !coverage) return null;

  const pct = coverage ? Math.round((coverage.covered / coverage.total) * 100) : null;

  return (
    <div className="mt-4 border-b border-border text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2 py-2.5 text-left"
      >
        <span
          className={
            health.problems > 0 ? 'text-error' : health.warnings > 0 ? 'text-warning' : 'text-success'
          }
        >
          <Icon name={health.problems > 0 ? 'x' : health.warnings > 0 ? 'bulb' : 'check-circle'} size={16} />
        </span>
        <span className="flex-1 text-text">
          {coverage && (
            <span className="font-medium">
              {coverage.covered} of {coverage.total} listed terms defined ({pct}%)
            </span>
          )}
          {coverage && health.findings.length > 0 && <span className="text-text-3"> · </span>}
          {health.findings.length > 0 && (
            <span className={health.problems > 0 ? 'text-error' : 'text-text-2'}>
              {health.problems > 0 && `${health.problems} problem${health.problems === 1 ? '' : 's'}`}
              {health.problems > 0 && health.warnings > 0 && ', '}
              {health.warnings > 0 && `${health.warnings} thing${health.warnings === 1 ? '' : 's'} to check`}
            </span>
          )}
          {clean && coverage && <span className="text-text-2"> · nothing else to flag</span>}
        </span>
        <span className="text-text-3">
          <Icon name={open ? 'x' : 'plus'} size={14} />
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border px-2 py-3">
          {coverage && coverage.missing.length > 0 && (
            <p className="text-text-2">
              The generator listed these terms as being in your notes but never defined them:{' '}
              <span className="text-text">{coverage.missing.join(', ')}</span>.
            </p>
          )}
          {/* The declared-terms finding is already spelled out above with the
              pointer to "More practice"; don't say it twice. */}
          {health.findings
            .filter((f) => !(f.id === 'declared-terms-missing' && coverage))
            .map((f) => (
              <div key={f.id} className="flex gap-2">
                <span className={f.severity === 'problem' ? 'text-error' : 'text-text-3'}>•</span>
                <span className="text-text-2">{f.message}</span>
              </div>
            ))}
          {clean && <p className="text-text-2">No structural problems found.</p>}

          {/* The findings above are only worth printing if something can be
              done about them. This hands them back to the chat that wrote the
              course — which, unlike the app, can see the notes and judge
              whether a missing term was ever worth an item. */}
          {onFix && !clean && (
            <button
              type="button"
              onClick={onFix}
              className="mt-1 inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              <Icon name="clipboard" size={14} />
              Send these to your AI to fix
            </button>
          )}
          <p className="pt-1 text-xs text-text-3">
            Checked without your original notes — the app can only hold the generator to the term
            list it declared. To verify every item really traces back to your source, run{' '}
            <code className="font-mono">npm run audit</code> against the course file.
          </p>
        </div>
      )}
    </div>
  );
}
