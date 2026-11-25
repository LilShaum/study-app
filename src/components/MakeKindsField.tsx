import { MAKE_KINDS, type MakeKind } from '@/lib/makeKinds';

/**
 * Which kinds of item to make (lib/makeKinds), as boxes always in view, all
 * ticked to begin with (docs/proposals/new-lecture-screen.md). All ticked
 * lets the AI pick the kind that fits each idea (the spec's "Which type for
 * what"); a box left unticked is a kind not written at all, and what it
 * would have asked moves into the kinds kept ("if they just want flash cards
 * … they will just get flash cards", the owner, 2026-10-29). A two-way
 * "What suits my material / Only the kinds I tick" choice stood in front of
 * the boxes for a day and was dropped: "ugly and low effort" (2026-11-25).
 * `only` narrows the list, for a prompt that makes questions only.
 */
export function MakeKindsField({ value, onChange, only }: { value: MakeKind[]; onChange: (v: MakeKind[]) => void; only?: readonly MakeKind[] }) {
  const shown = only ? MAKE_KINDS.filter((k) => only.includes(k.value)) : MAKE_KINDS;
  const all = shown.every((k) => value.includes(k.value));
  const none = !shown.some((k) => value.includes(k.value));
  const toggle = (k: MakeKind) => onChange(value.includes(k) ? value.filter((v) => v !== k) : [...value, k]);
  return (
    <fieldset>
      <legend className="sr-only">Kinds of item to make</legend>
      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
        {shown.map((k) => (
          <label key={k.value} className="tap-safe flex cursor-pointer items-center gap-2 py-1 text-sm text-text">
            <input type="checkbox" checked={value.includes(k.value)} onChange={() => toggle(k.value)} className="accent-accent" />
            {k.label}
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-small text-text-3" aria-live="polite">
        {none ? <span className="text-error">Choose at least one.</span> : 'Each idea becomes whichever ticked kind suits it best.'}
        {!all && (
          <>
            {' '}
            <button
              type="button"
              onClick={() => onChange(shown.map((k) => k.value))}
              className="tap-safe text-text-2 underline decoration-border underline-offset-2 hover:text-text"
            >
              Tick all
            </button>
          </>
        )}
      </p>
    </fieldset>
  );
}
