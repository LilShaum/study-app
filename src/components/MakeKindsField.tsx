import { MAKE_KINDS, type MakeKind } from '@/lib/makeKinds';

/**
 * Which kinds of item to make (lib/makeKinds), as boxes always in view.
 *
 * Given `onAi`, two named ways sit over the boxes, set as the app sets every
 * one-of choice: "The AI chooses" (every kind is open to it, and it picks the
 * kind that fits each idea, the spec's "Which type for what") or "Only these"
 * (a kind unticked is not written at all: "if they just want flash cards …
 * they will just get flash cards", the owner, 2026-10-29). In the AI's way the
 * boxes show every kind ticked, quiet; touching one moves to "Only these" with
 * that box changed, so they are never dead. No line of text under it: the
 * labels and what the boxes show are the explanation, and how the AI decides
 * is in Help (the owner, 2026-11-25, Testing 6: "intuitive and elegant design
 * that makes the user understand how it works without needing to put shitty
 * ai explainer text"; docs/proposals/new-lecture-screen.md).
 *
 * `only` narrows the list, for a prompt that makes questions only, which
 * keeps to the boxes alone (written answers only when ticked).
 */
export function MakeKindsField({
  value,
  onChange,
  only,
  ai = false,
  onAi,
}: {
  value: MakeKind[];
  onChange: (v: MakeKind[]) => void;
  only?: readonly MakeKind[];
  /** The AI chooses the kinds (with `onAi`). */
  ai?: boolean;
  onAi?: (ai: boolean) => void;
}) {
  const shown = only ? MAKE_KINDS.filter((k) => only.includes(k.value)) : MAKE_KINDS;
  const choosing = !!onAi && ai;
  const none = !choosing && !shown.some((k) => value.includes(k.value));
  const toggle = (k: MakeKind) => {
    if (choosing) {
      // From the AI's way: every kind but the one touched.
      onAi!(false);
      onChange(shown.map((s) => s.value).filter((v) => v !== k));
      return;
    }
    onChange(value.includes(k) ? value.filter((v) => v !== k) : [...value, k]);
  };
  const way = (on: boolean) =>
    `tap-safe text-sm ${on ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'text-text-2 hover:text-text'}`;

  return (
    <fieldset>
      <legend className="sr-only">Kinds of item to make</legend>
      {onAi && (
        <div role="radiogroup" aria-label="Who chooses the kinds" className="mb-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <button type="button" role="radio" aria-checked={ai} onClick={() => onAi(true)} className={way(ai)}>
            The AI chooses
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!ai}
            onClick={() => {
              if (!ai) return;
              onAi(false);
              onChange(shown.map((s) => s.value));
            }}
            className={way(!ai)}
          >
            Only these
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
        {shown.map((k) => (
          <label
            key={k.value}
            className={`tap-safe flex cursor-pointer items-center gap-2 py-1 text-sm ${choosing ? 'text-text-3' : 'text-text'}`}
          >
            <input
              type="checkbox"
              checked={choosing || value.includes(k.value)}
              onChange={() => toggle(k.value)}
              className={choosing ? '[accent-color:var(--color-text-3)]' : 'accent-accent'}
            />
            {k.label}
          </label>
        ))}
      </div>
      {none && (
        <p className="mt-1.5 text-small text-error" aria-live="polite">
          Choose at least one.
        </p>
      )}
    </fieldset>
  );
}
