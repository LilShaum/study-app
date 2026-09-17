import type { FormEvent, ReactNode } from 'react';
import type { Difficulty, StudyItem } from '@/schema/course';

interface EditItemFormProps {
  item: StudyItem;
  onSave: (updated: StudyItem) => void;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded border border-border bg-bg px-2.5 py-1.5 text-sm text-text focus:border-accent focus:outline-none';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-text-2">{label}</span>
      {children}
    </label>
  );
}

function TypeFields({ item }: { item: StudyItem }) {
  switch (item.type) {
    case 'mcq':
      return (
        <>
          <Field label="Question">
            <textarea name="question" defaultValue={item.question} rows={2} className={inputClass} />
          </Field>
          {/* Driven by the item's own option count, not a hardcoded 4: the
              schema allows any number >= 2, and reading back a fixed 4 silently
              dropped a 5th option and padded 2-option questions with blanks. */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(item.options ?? []).map((opt, i) => (
              <Field key={i} label={`Option ${'ABCDEFGH'[i] ?? i + 1}`}>
                <input name={`option_${i}`} defaultValue={opt} className={inputClass} />
              </Field>
            ))}
          </div>
          <Field label="Correct answer">
            <select name="correct_index" defaultValue={item.correct_index} className={inputClass}>
              {(item.options ?? []).map((opt, i) => (
                <option key={i} value={i}>
                  {'ABCD'[i]} — {opt.slice(0, 50)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Explanation">
            <textarea name="explanation" defaultValue={item.explanation} rows={2} className={inputClass} />
          </Field>
        </>
      );
    case 'flashcard':
      return (
        <>
          <Field label="Front">
            <textarea name="front" defaultValue={item.front} rows={2} className={inputClass} />
          </Field>
          <Field label="Back">
            <textarea name="back" defaultValue={item.back} rows={2} className={inputClass} />
          </Field>
          <Field label="Hint (optional)">
            <input name="hint" defaultValue={item.hint ?? ''} className={inputClass} />
          </Field>
        </>
      );
    case 'definition':
      return (
        <>
          <Field label="Term">
            <input name="term" defaultValue={item.term} className={inputClass} />
          </Field>
          <Field label="Definition">
            <textarea name="definition" defaultValue={item.definition} rows={2} className={inputClass} />
          </Field>
          <Field label="Example sentence">
            <textarea
              name="example_sentence"
              defaultValue={item.example_sentence ?? ''}
              rows={2}
              className={inputClass}
            />
          </Field>
          <Field label="Related terms (comma-separated)">
            <input name="related_terms" defaultValue={(item.related_terms ?? []).join(', ')} className={inputClass} />
          </Field>
          <Field label="Also known as (comma-separated)">
            <input name="also_known_as" defaultValue={(item.also_known_as ?? []).join(', ')} className={inputClass} />
          </Field>
        </>
      );
    case 'example':
      return (
        <>
          <Field label="Title">
            <input name="title" defaultValue={item.title} className={inputClass} />
          </Field>
          <Field label="Context">
            <textarea name="context" defaultValue={item.context ?? ''} rows={2} className={inputClass} />
          </Field>
          <Field label="Steps (one per line)">
            <textarea name="steps" defaultValue={(item.steps ?? []).join('\n')} rows={4} className={inputClass} />
          </Field>
          <Field label="Takeaway">
            <textarea name="takeaway" defaultValue={item.takeaway ?? ''} rows={2} className={inputClass} />
          </Field>
        </>
      );
    case 'graphic':
      return (
        <>
          <Field label="Title">
            <input name="title" defaultValue={item.title} className={inputClass} />
          </Field>
          <Field label="Caption">
            <input name="caption" defaultValue={item.caption ?? ''} className={inputClass} />
          </Field>
          <Field label="Alt text">
            <textarea name="alt_text" defaultValue={item.alt_text ?? ''} rows={2} className={inputClass} />
          </Field>
          <p className="text-xs text-text-3">
            The diagram image itself isn't editable here — re-generate the course to change it.
          </p>
        </>
      );
  }
}

export function EditItemForm({ item, onSave, onCancel }: EditItemFormProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const str = (name: string) => String(data.get(name) ?? '').trim();
    const splitList = (v: FormDataEntryValue | null) =>
      String(v ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    let updated: StudyItem;
    switch (item.type) {
      case 'mcq': {
        const options = (item.options ?? []).map((_, i) => str(`option_${i}`));
        const submitted = Number(data.get('correct_index'));
        updated = {
          ...item,
          question: str('question'),
          options,
          // Clamp so a stale/out-of-range index can't point past the options
          // and render "the answer is <blank>" on reveal.
          correct_index: Number.isFinite(submitted)
            ? Math.min(Math.max(submitted, 0), Math.max(options.length - 1, 0))
            : 0,
          explanation: str('explanation'),
        };
        break;
      }
      case 'flashcard':
        updated = { ...item, front: str('front'), back: str('back'), hint: str('hint') || undefined };
        break;
      case 'definition':
        updated = {
          ...item,
          term: str('term'),
          definition: str('definition'),
          example_sentence: str('example_sentence') || undefined,
          related_terms: splitList(data.get('related_terms')),
          also_known_as: splitList(data.get('also_known_as')),
        };
        break;
      case 'example':
        updated = {
          ...item,
          title: str('title'),
          context: str('context') || undefined,
          steps: str('steps').split('\n').map((s) => s.trim()).filter(Boolean),
          takeaway: str('takeaway') || undefined,
        };
        break;
      case 'graphic':
        updated = {
          ...item,
          title: str('title'),
          caption: str('caption') || undefined,
          alt_text: str('alt_text') || undefined,
        };
        break;
    }

    const difficulty = str('difficulty');
    updated.difficulty = (difficulty || undefined) as Difficulty | undefined;
    updated.tags = splitList(data.get('tags'));
    onSave(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-accent-border bg-surface p-5">
      <TypeFields item={item} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Difficulty">
          <select name="difficulty" defaultValue={item.difficulty ?? ''} className={inputClass}>
            <option value="">—</option>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </Field>
        <Field label="Tags (comma-separated)">
          <input name="tags" defaultValue={(item.tags ?? []).join(', ')} className={inputClass} />
        </Field>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border px-4 py-1.5 text-sm text-text-2 hover:text-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
