import { useMemo, useState } from 'react';
import type { Course } from '@/schema/course';
import { parseFragment } from '@/schema/fragment';
import { planMerge, type MergePlan } from '@/lib/mergeFragment';
import { buildAddPrompt } from '@/lib/buildAddPrompt';
import { buildPractisePrompt } from '@/lib/buildPractisePrompt';
import { buildFixPrompt, planFixes } from '@/lib/buildFixPrompt';
import { analyseCourseGaps } from '@/lib/courseGaps';
import { sortedSections } from '@/lib/sortedSections';
import { useCoursesStore } from '@/store/courses';
import { persisted } from '@/lib/safeStorage';
import { toast } from '@/store/toast';
import { Icon } from './Icon';

const STORAGE_FULL =
  "Browser storage is full, so this wasn't saved — it will disappear when you reload. Export a course you've finished and remove it, then try again.";

export type AddMode = 'material' | 'practice' | 'fix';

interface AddToCourseDialogProps {
  courseId: string;
  course: Course;
  onClose: () => void;
  /** Which prompt to hand out. Both paths merge through the same plan. */
  initialMode?: AddMode;
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
export function AddToCourseDialog({ courseId, course, onClose, initialMode = 'material' }: AddToCourseDialogProps) {
  const [mode, setMode] = useState<AddMode>(initialMode);
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
  const canApply = !!plan && plan.totalAdded + plan.totalCorrected > 0;

  const gaps = useMemo(() => analyseCourseGaps(course), [course]);
  const fixes = useMemo(() => planFixes(course), [course]);

  const copyPrompt = async () => {
    const prompt =
      mode === 'fix'
        ? buildFixPrompt(course)
        : mode === 'practice'
          ? buildPractisePrompt(course)
          : buildAddPrompt(course);
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
    const { ok } = persisted(() => mergeIntoCourse(courseId, plan));
    if (!ok) {
      toast(STORAGE_FULL, { type: 'error', duration: 12000 });
      onClose();
      return;
    }
    const renamed = Object.keys(plan.renamedIds).length;
    const parts: string[] = [];
    if (plan.totalAdded) parts.push(`Added ${plural(plan.totalAdded, 'item')}`);
    if (plan.totalCorrected) parts.push(`fixed ${plural(plan.totalCorrected, 'item')}`);
    toast(
      `${parts.join(', ')}.${renamed ? ` ${plural(renamed, 'id')} renamed to avoid a clash.` : ''}`,
      { type: 'success' },
    );
    onClose();
  };

  const MODE_TITLES: Record<AddMode, string> = {
    material: 'Add material to this course',
    practice: 'More practice on this course',
    fix: 'Fix what the check found',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${MODE_TITLES[mode]} — ${course.metadata.title}`}
    >
      <div className="my-8 w-full max-w-2xl rounded-sm border border-border-strong bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold text-text">{MODE_TITLES[mode]}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-3 hover:text-text"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-5 pt-3" role="tablist">
          {(
            [
              ['material', 'New material'],
              ['practice', 'More practice'],
              ['fix', 'Fix gaps'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                setMode(value);
                setCopied(false);
              }}
              className={`rounded-t px-3 py-1.5 text-sm ${
                mode === value
                  ? 'border-b-2 border-accent font-medium text-text'
                  : 'text-text-2 hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-5 px-5 py-4">
          {/* Step 1 */}
          <section>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-3">
              Step 1 — generate
            </div>
            {mode === 'material' ? (
              <p className="mb-2 text-sm text-text-2">
                Copy the prompt, paste it into your AI chat along with your new notes, and it will
                return JSON. The prompt already tells it which sections, item ids and tags this
                course uses, so it won&apos;t duplicate or collide with what you have.
              </p>
            ) : mode === 'fix' ? (
              <p className="mb-2 text-sm text-text-2">
                Hands the check&apos;s findings back to the AI that wrote this course.{' '}
                <strong>Paste it into that same chat</strong> — your original notes are still there,
                and they are the only thing that can judge whether a missing term actually mattered.
                The prompt asks for that judgement first: it is told that &ldquo;not worth an
                item&rdquo; is a correct answer, so a term your notes only mention in passing gets
                skipped with a reason rather than padded out.
              </p>
            ) : (
              <p className="mb-2 text-sm text-text-2">
                For when you already know the existing questions. This prompt asks for{' '}
                <strong>new questions on the material you already have</strong> — no notes needed.
                Each item recorded a quote from your original source, and the prompt hands those
                back as the material to write from. Paste it into the same chat you generated the
                course in and it will use your full notes instead, which is better.
              </p>
            )}

            {mode === 'fix' &&
              (fixes.empty ? (
                <div className="mb-2 border-l-2 border-border py-1.5 pl-3 text-sm text-text-2">
                  The check found nothing to fix — every term the generator listed has a definition,
                  every definition is tested somewhere, and no question has a broken answer key. The
                  prompt would be asking for nothing.
                </div>
              ) : (
                <div className="mb-2 border-l-2 border-border py-1.5 pl-3 text-sm text-text-2">
                  <div className="mb-1 font-medium text-text">The prompt will ask it to:</div>
                  <ul className="list-inside list-disc space-y-0.5">
                    {fixes.missingTerms.length > 0 && (
                      <li>
                        judge and, where worth it, define{' '}
                        {plural(fixes.missingTerms.length, 'listed term')} that never got a
                        definition
                        <span className="text-text-3">
                          {' '}
                          — {fixes.missingTerms.slice(0, 4).join(', ')}
                          {fixes.missingTerms.length > 4 ? '…' : ''}
                        </span>
                      </li>
                    )}
                    {fixes.untestedTerms.length > 0 && (
                      <li>
                        write questions for {plural(fixes.untestedTerms.length, 'term')} that are
                        defined but never tested
                      </li>
                    )}
                    {fixes.faultyItems.length > 0 && (
                      <li>
                        repair {plural(fixes.faultyItems.length, 'question')} with a broken answer
                        key, a misaligned explanation or the wrong number of options
                      </li>
                    )}
                  </ul>
                </div>
              ))}

            {mode === 'practice' &&
              (gaps.untestedTerms.length > 0 ||
                gaps.thinSections.length > 0 ||
                gaps.gradableRatio < 0.5) && (
                <div className="mb-2 border-l-2 border-border py-1.5 pl-3 text-sm text-text-2">
                  <div className="mb-1 font-medium text-text">The prompt will prioritise:</div>
                  <ul className="list-inside list-disc space-y-0.5">
                    {gaps.untestedTerms.length > 0 && (
                      <li>
                        {plural(gaps.untestedTerms.length, 'term')} defined but never tested
                        <span className="text-text-3">
                          {' '}
                          — {gaps.untestedTerms.slice(0, 4).join(', ')}
                          {gaps.untestedTerms.length > 4 ? '…' : ''}
                        </span>
                      </li>
                    )}
                    {gaps.thinSections.length > 0 && (
                      <li>
                        {plural(gaps.thinSections.length, 'section')} with little that can be scored
                        <span className="text-text-3">
                          {' '}
                          — {gaps.thinSections.slice(0, 3).map((x) => x.title).join(', ')}
                          {gaps.thinSections.length > 3 ? '…' : ''}
                        </span>
                      </li>
                    )}
                    {gaps.gradableRatio < 0.5 && (
                      <li>
                        only {Math.round(gaps.gradableRatio * 100)}% of items are gradable (MCQ or
                        flashcard)
                      </li>
                    )}
                  </ul>
                </div>
              )}
            <button
              type="button"
              onClick={copyPrompt}
              className="press"
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
                className="field w-full font-mono text-xs"
              />
            </label>
          </section>

          {/* Feedback */}
          {result && 'error' in result && (
            <div
              role="alert"
              className="whitespace-pre-wrap border-l-2 border-error py-2 pl-3 text-sm text-error"
            >
              {result.error}
            </div>
          )}

          {plan && (
            <div className="border-l-2 border-border-strong bg-bg py-2 pl-3 text-sm">
              {plan.totalAdded === 0 && plan.totalCorrected === 0 ? (
                <div className="text-text-2">
                  Nothing new to add
                  {plan.totalDuplicates > 0
                    ? ` — all ${plural(plan.totalDuplicates, 'item')} already exist in this course.`
                    : '.'}
                </div>
              ) : plan.totalAdded === 0 ? null : (
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

              {plan.totalCorrected > 0 && (
                <div className={plan.totalAdded > 0 ? 'mt-2.5 border-t border-border pt-2' : ''}>
                  <div className="font-medium text-text">
                    Fixing {plural(plan.totalCorrected, 'existing item')} in place
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-text-2">
                    {plan.corrections.slice(0, 8).map((c) => (
                      <li key={c.id}>
                        → <span className="font-mono text-xs">{c.id}</span>
                        <span className="text-text-3"> — changes {c.changed.join(', ')}</span>
                      </li>
                    ))}
                    {plan.corrections.length > 8 && (
                      <li className="text-text-3">+{plan.corrections.length - 8} more</li>
                    )}
                  </ul>
                  <div className="mt-1 text-xs text-text-3">
                    Each keeps its id, so your progress on it is kept too.
                  </div>
                </div>
              )}

              {plan.unmatchedCorrections.length > 0 && (
                <div className="mt-1.5 text-text-3">
                  Ignoring {plural(plan.unmatchedCorrections.length, 'correction')} for{' '}
                  {plan.unmatchedCorrections.length === 1 ? 'an id' : 'ids'} this course
                  doesn&rsquo;t have ({plan.unmatchedCorrections.slice(0, 3).join(', ')}
                  {plan.unmatchedCorrections.length > 3 ? '…' : ''}).
                </div>
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
            disabled={!canApply}
            className="press press-ink"
          >
            {plan && (plan.totalAdded > 0 || plan.totalCorrected > 0)
              ? [
                  plan.totalAdded > 0 ? `Add ${plural(plan.totalAdded, 'item')}` : null,
                  plan.totalCorrected > 0 ? `fix ${plural(plan.totalCorrected, 'item')}` : null,
                ]
                  .filter(Boolean)
                  .join(' & ')
              : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
