import { useState, type FormEvent, type ReactNode } from 'react';
import type { Difficulty, McqItem, StudyItem } from '@/schema/course';
import { normalisedRationale } from '@/lib/mcqRationale';

interface EditItemFormProps {
  item: StudyItem;
  onSave: (updated: StudyItem) => void;
  onCancel: () => void;
}

const inputClass =
  'w-full rounded border border-border bg-bg px-2.5 py-1.5 text-sm text-text focus:border-accent';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-text-2">{label}</span>
      {children}
    </label>
  );
}

const LETTERS = 'ABCDEFGH';
const MAX_OPTIONS = LETTERS.length;
/** The schema's floor: a one-option "question" isn't one. */
const MIN_OPTIONS = 2;

interface McqDraft {
  options: string[];
  correctIndex: number;
  rationale: string[] | undefined;
}

function initialMcqDraft(item: McqItem): McqDraft {
  return {
    options: [...(item.options ?? [])],
    correctIndex: item.correct_index ?? 0,
    rationale: normalisedRationale(item),
  };
}

/**
 * The options of one MCQ, as an editable list.
 *
 * Adding and removing options is the reason this is controlled state rather
 * than the uncontrolled inputs the rest of the form uses: a `defaultValue`
 * doesn't follow a list that changes shape, so removing option B would have
 * left C's text sitting in B's box.
 *
 * Removing an option moves two other things with it — the answer key and the
 * per-option rationale — and leaving either behind is a silent corruption
 * rather than a visible one: a stale key marks the wrong option right, and a
 * stale rationale explains the wrong answer under the wrong option.
 */
function McqOptions({ draft, onChange }: { draft: McqDraft; onChange: (d: McqDraft) => void }) {
  const { options, correctIndex, rationale } = draft;

  const setOption = (i: number, value: string) => {
    const next = options.slice();
    next[i] = value;
    onChange({ ...draft, options: next });
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    onChange({
      ...draft,
      options: [...options, ''],
      rationale: rationale ? [...rationale, ''] : undefined,
    });
  };

  const removeOption = (i: number) => {
    if (options.length <= MIN_OPTIONS) return;
    const nextOptions = options.filter((_, n) => n !== i);
    // Removing the answer leaves no answer, so the key falls back to the
    // first option and the student re-picks; removing anything before it just
    // shifts it up.
    const nextCorrect = i === correctIndex ? 0 : i < correctIndex ? correctIndex - 1 : correctIndex;
    onChange({
      options: nextOptions,
      correctIndex: nextCorrect,
      rationale: rationale ? rationale.filter((_, n) => n !== i) : undefined,
    });
  };

  return (
    <>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field label={`Option ${LETTERS[i] ?? i + 1}`}>
                <input
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  className={inputClass}
                  aria-label={`Option ${LETTERS[i] ?? i + 1}`}
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={options.length <= MIN_OPTIONS}
              aria-label={`Remove option ${LETTERS[i] ?? i + 1}`}
              title={options.length <= MIN_OPTIONS ? 'A question needs at least two options' : 'Remove this option'}
              className="mb-1.5 rounded border border-border px-2 py-1.5 text-text-3 hover:text-text disabled:opacity-40"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addOption}
          disabled={options.length >= MAX_OPTIONS}
          className="rounded border border-border px-3 py-1 text-sm text-text-2 hover:border-border-strong hover:text-text disabled:opacity-40"
        >
          + Add option
        </button>
        {options.length !== 4 && (
          <span className="text-xs text-text-3">
            {options.length} options — the generator&rsquo;s contract asks for four.
          </span>
        )}
      </div>

      <Field label="Correct answer">
        <select
          value={correctIndex}
          onChange={(e) => onChange({ ...draft, correctIndex: Number(e.target.value) })}
          className={inputClass}
        >
          {options.map((opt, i) => (
            <option key={i} value={i}>
              {LETTERS[i] ?? i + 1} — {opt.slice(0, 50)}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}

function TypeFields({
  item,
  mcqDraft,
  onMcqChange,
}: {
  item: StudyItem;
  mcqDraft: McqDraft;
  onMcqChange: (d: McqDraft) => void;
}) {
  switch (item.type) {
    case 'mcq':
      return (
        <>
          <Field label="Question">
            <textarea name="question" defaultValue={item.question} rows={2} className={inputClass} />
          </Field>
          <McqOptions draft={mcqDraft} onChange={onMcqChange} />
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
  const [mcqDraft, setMcqDraft] = useState<McqDraft>(() =>
    item.type === 'mcq' ? initialMcqDraft(item) : { options: [], correctIndex: 0, rationale: undefined },
  );

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
        const { options, correctIndex, rationale } = mcqDraft;
        updated = {
          ...item,
          question: str('question'),
          options,
          // Clamp so a stale/out-of-range index can't point past the options
          // and render "the answer is <blank>" on reveal.
          correct_index: Math.min(Math.max(correctIndex, 0), Math.max(options.length - 1, 0)),
          explanation: str('explanation'),
          // Written back index-aligned (the contract's shape) whatever shape
          // it arrived in, since that is the only one that stays correct
          // through an add or a remove.
          ...(rationale ? { distractor_rationale: rationale } : {}),
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border-strong bg-surface p-5">
      <TypeFields item={item} mcqDraft={mcqDraft} onMcqChange={setMcqDraft} />
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
