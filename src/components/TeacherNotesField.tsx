/**
 * "What your teacher said": optional notes sent with the prompt
 * (lib/teacherNotes). Kept on the lecture, so they are written once.
 */
export function TeacherNotesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-3">
        What your teacher said (optional)
      </span>
      <span className="mb-1.5 block text-sm text-text-2">
        Anything about what is or isn&rsquo;t needed. The AI follows it over its own judgement, and it is kept with this
        lecture for later prompts.
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="The table on slide 14 is just to illustrate. We need the whole pathway on slide 22."
        className="field w-full resize-y text-sm"
      />
    </label>
  );
}
