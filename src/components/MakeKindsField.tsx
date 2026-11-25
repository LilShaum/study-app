import { useState } from 'react';
import { MAKE_KINDS, type MakeKind } from '@/lib/makeKinds';

/**
 * Which kinds of item to make (lib/makeKinds). Two plain choices first: what
 * suits the material, where every kind is allowed and the AI picks the one
 * that fits each idea (the spec's "Which type for what"), or only the kinds
 * ticked, where an unticked kind is not written at all and what it would
 * have asked moves into the kinds kept. The first is the default, for a
 * student who is not sure (the owner, 2026-11-25: "suggested items").
 * `only` narrows the list, for a prompt that makes questions only.
 */
export function MakeKindsField({ value, onChange, only }: { value: MakeKind[]; onChange: (v: MakeKind[]) => void; only?: readonly MakeKind[] }) {
  const shown = only ? MAKE_KINDS.filter((k) => only.includes(k.value)) : MAKE_KINDS;
  const all = shown.every((k) => value.includes(k.value));
  const [picking, setPicking] = useState(!all);
  const toggle = (k: MakeKind) => onChange(value.includes(k) ? value.filter((v) => v !== k) : [...value, k]);
  const choice = (on: boolean) =>
    `tap-safe text-left text-sm ${on ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'text-text-2 hover:text-text'}`;
  return (
    <fieldset>
      <legend className="sr-only">What to make</legend>
      <div role="radiogroup" aria-label="What to make" className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <button
          type="button"
          role="radio"
          aria-checked={!picking}
          onClick={() => {
            setPicking(false);
            onChange(shown.map((k) => k.value));
          }}
          className={choice(!picking)}
        >
          What suits my material <span className="mark text-text-3">suggested</span>
        </button>
        <button type="button" role="radio" aria-checked={picking} onClick={() => setPicking(true)} className={choice(picking)}>
          Only the kinds I tick
        </button>
      </div>
      {picking && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-x-4 sm:grid-cols-3">
            {shown.map((k) => (
              <label key={k.value} className="tap-safe flex cursor-pointer items-center gap-2 py-1 text-sm text-text">
                <input type="checkbox" checked={value.includes(k.value)} onChange={() => toggle(k.value)} className="accent-accent" />
                {k.label}
              </label>
            ))}
          </div>
          {!shown.some((k) => value.includes(k.value)) && <p className="mt-1 text-sm text-error">Choose at least one.</p>}
        </>
      )}
    </fieldset>
  );
}
