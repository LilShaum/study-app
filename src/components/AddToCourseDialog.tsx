import { useMemo, useState } from 'react';
import type { Course } from '@/schema/course';
import { parseFragment } from '@/schema/fragment';
import { planMerge, type MergePlan } from '@/lib/mergeFragment';
import { buildAddPrompt } from '@/lib/buildAddPrompt';
import { sortedSections } from '@/lib/sortedSections';
import { useCoursesStore } from '@/store/courses';
import { toast } from '@/store/toast';
import { Icon } from './Icon';

interface AddToCourseDialogProps {
  courseId: string;
  course: Course;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  flashcard: 'flashcard',
  definition: 'definition',
  example: 'example',
  graphic: 'diagram',
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Two-step "add material to this course": copy a context-loaded prompt out to
 * your AI chat, paste the JSON back in.
 *
 * The paste is never applied sight-unseen. Parsing produces a plan, the plan
 * is rendered as a preview, and only the confirm button commits it — so the
 * student sees "12 items into 2 sections, 3 duplicates skipped" before
 * anything touches their course.
 */
export function AddToCourseDialog({ courseId, course, onClose }: AddToCourseDialogProps) {
  const [pasted, setPasted] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [copied, setCopied] = useState(false);
  const mergeIntoCourse = useCoursesStore((s) => s.mergeIntoCourse);

  const firstSectionId = sortedSections(course)[0]?.id ?? 'added';

  // Re-planned on every keystroke: parsing a paste is cheap and pure, and it
  // means the preview and the error both track what's actually in the box.
  const result = useMemo((): { plan: MergePlan } | { error: string } | null => {
    const text = pasted.trim();
    if (!text) return null;

    // Tolerate a ```json fence — models add one even when told not to.
    const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let json: unknown;
    try {
      json = JSON.parse(unfenced);
    } catch (e) {
      return { error: `That isn't valid JSON — ${(e as Error).message}` };
    }

    const parsed = parseFragment(json, firstSectionId);
    if (!parsed.ok) return { error: parsed.error };

    return { plan: planMerge(course, parsed.fragment, { skipDuplicates }) };
  }, [pasted, course, firstSectionId, skipDuplicates]);

  const plan = result && 'plan' in result ? result.plan : null;
  const canAdd = !!plan && plan.totalAdded > 0;

  const copyPrompt = async () => {
    const prompt = buildAddPrompt(course);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked without a secure context or permission. Don't
      // strand the student — hand them the text to copy by hand.
      setPasted('');
      toast('Clipboard blocked — the prompt was opened in a new tab instead.', { type: 'info' });
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<pre style="white-space:pre-wrap;font:13px/1.5 system-ui;padding:16px">${
          prompt.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))
        }</pre>`);
        w.document.close();
      }
    }
  };

  const confirm = () => {
    if (!plan) return;
    mergeIntoCourse(courseId, plan);
    const renamed = Object.keys(plan.renamedIds).length;
    toast(
      `Added ${plural(plan.totalAdded, 'item')}.${renamed ? ` ${plural(renamed, 'id')} renamed to avoid a clash.` : ''}`,
      { type: 'success' },
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Add material to ${course.metadata.title}`}
    >
      <div className="my-8 w-full max-w-2xl rounded-lg border border-border bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold text-text">Add material to this course</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-3 hover:text-text"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {/* Step 1 */}
          <section>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-3">
              Step 1 — generate
            </div>
            <p className="mb-2 text-sm text-text-2">
              Copy the prompt, paste it into your AI chat along with your new notes, and it will
              return JSON. The prompt already tells it which sections, item ids and tags this course
              uses, so it won&apos;t duplicate or collide with what you have.
            </p>
            <button
              type="button"
              onClick={copyPrompt}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-bg px-3 py-1.5 text-sm text-text hover:border-accent-border"
            >
              <Icon name={copied ? 'check-circle' : 'clipboard'} size={14} />
              {copied ? 'Prompt copied' : 'Copy prompt'}
            </button>
          </section>

          {/* Step 2 */}
          <section>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-3">
                Step 2 — paste the JSON back
              </span>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={8}
                spellCheck={false}
                placeholder={'{\n  "sections": [\n    { "id": "…", "items": [ … ] }\n  ]\n}'}
                className="w-full rounded border border-border bg-bg px-2.5 py-2 font-mono text-xs text-text focus:border-accent focus:outline-none"
              />
            </label>
          </section>

          {/* Feedback */}
          {result && 'error' in result && (
            <div
              role="alert"
              className="whitespace-pre-wrap rounded border border-error bg-error-bg px-3 py-2 text-sm text-error"
            >
              {result.error}
            </div>
          )}

          {plan && (
            <div className="rounded border border-border bg-bg px-3 py-2.5 text-sm">
              {plan.totalAdded === 0 ? (
                <div className="text-text-2">
                  Nothing new to add
                  {plan.totalDuplicates > 0
                    ? ` — all ${plural(plan.totalDuplicates, 'item')} already exist in this course.`
                    : '.'}
                </div>
              ) : (
                <>
                  <div className="font-medium text-text">
                    Adding {plural(plan.totalAdded, 'item')}
                    {Object.keys(plan.countsByType).length > 0 && (
                      <span className="font-normal text-text-2">
                        {' '}
                        (
                        {Object.entries(plan.countsByType)
                          .map(([type, n]) => plural(n, TYPE_LABELS[type] ?? type))
                          .join(', ')}
                        )
                      </span>
                    )}
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-text-2">
                    {plan.sections
                      .filter((s) => s.added.length > 0)
                      .map((s) => (
                        <li key={s.id}>
                          → {s.title}
                          {s.isNew && <span className="text-accent"> (new section)</span>}:{' '}
                          {plural(s.added.length, 'item')}
                        </li>
                      ))}
                  </ul>
                </>
              )}

              {plan.totalDuplicates > 0 && plan.totalAdded > 0 && (
                <div className="mt-1.5 text-text-3">
                  Skipping {plural(plan.totalDuplicates, 'item')} already in this course.
                </div>
              )}
              {Object.keys(plan.renamedIds).length > 0 && (
                <div className="mt-1.5 text-text-3">
                  {plural(Object.keys(plan.renamedIds).length, 'item id')} will be renamed to avoid
                  overwriting existing progress.
                </div>
              )}
            </div>
          )}

          {plan && plan.totalDuplicates > 0 && (
            <label className="flex items-center gap-2 text-sm text-text-2">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              Skip items this course already covers
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-text-2 hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!canAdd}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {plan && plan.totalAdded > 0 ? `Add ${plural(plan.totalAdded, 'item')}` : 'Add items'}
          </button>
        </div>
      </div>
    </div>
  );
}
