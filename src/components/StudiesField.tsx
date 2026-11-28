/**
 * Whether the AI teaches each study on the slides in depth (its question,
 * method, result and what it shows, filled in where the slides only cite
 * it) or only as evidence for its point (lib/generatorSpec). Off unless
 * ticked: in depth by default spent much of the owner's usage on a class
 * that never asks about studies (2026-10-26).
 */
export function StudiesField({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="tap-safe flex cursor-pointer items-start gap-2 py-1 text-sm text-text">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 accent-accent" />
      <span>
        My exams ask about the studies in my material{' '}
        <span className="text-text-3">(each taught in full: much more of the AI&rsquo;s usage)</span>
      </span>
    </label>
  );
}

/** "Explain more than my slides do" (lib/moreContext): off unless ticked, since it makes a longer file. */
export function MoreContextField({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="tap-safe flex cursor-pointer items-start gap-2 py-1 text-sm text-text">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 accent-accent" />
      <span>
        Explain more than my slides do <span className="text-text-3">(a longer file)</span>
      </span>
    </label>
  );
}
