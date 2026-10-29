import { MAKE_KINDS, type MakeKind } from '@/lib/makeKinds';

/**
 * Which kinds of item to make (lib/makeKinds), ticked: all of them by
 * default, untick what is not wanted. `only` narrows the list, for a
 * prompt that makes questions only (More practice).
 */
export function MakeKindsField({ value, onChange, only }: { value: MakeKind[]; onChange: (v: MakeKind[]) => void; only?: readonly MakeKind[] }) {
  const shown = only ? MAKE_KINDS.filter((k) => only.includes(k.value)) : MAKE_KINDS;
  const toggle = (k: MakeKind) => onChange(value.includes(k) ? value.filter((v) => v !== k) : [...value, k]);
  return (
    <fieldset>
      <legend className="sr-only">What to make</legend>
      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
        {shown.map((k) => (
          <label key={k.value} className="tap-safe flex cursor-pointer items-center gap-2 py-1 text-sm text-text">
            <input type="checkbox" checked={value.includes(k.value)} onChange={() => toggle(k.value)} className="accent-accent" />
            {k.label}
          </label>
        ))}
      </div>
      {!shown.some((k) => value.includes(k.value)) && <p className="mt-1 text-sm text-error">Choose at least one.</p>}
    </fieldset>
  );
}
