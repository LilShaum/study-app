/**
 * Whether the AI teaches each study on the slides in depth (its question,
 * method, result and what it shows, filled in where the slides only cite
 * it) or only as evidence for its point (lib/generatorSpec). Off unless
 * ticked: in depth by default spent much of the owner's usage on a class
 * that never asks about studies (2026-10-26).
 */
export function StudiesField({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-sm text-text-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <span>
        <span className="text-text">My exams ask about the studies in my material</span>
        <span className="block text-text-3">Each study is then taught in full, which uses much more of the AI&rsquo;s usage.</span>
      </span>
    </label>
  );
}
