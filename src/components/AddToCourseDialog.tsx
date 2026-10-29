import { useMemo, useState } from 'react';
import { withExamSections } from '@/lib/classExams';
import { useDialog } from '@/lib/useDialog';
import type { Course } from '@/schema/course';
import { parseFragment } from '@/schema/fragment';
import { planMerge, type MergePlan } from '@/lib/mergeFragment';
import { buildAddPrompt } from '@/lib/buildAddPrompt';
import { buildPractisePrompt } from '@/lib/buildPractisePrompt';
import { buildFixPrompt, planFixes } from '@/lib/buildFixPrompt';
import { buildExplainPrompt } from '@/lib/buildExplainPrompt';
import { hasStudies } from '@/lib/generatorSpec';
import { StudiesField } from './StudiesField';
import { MakeKindsField } from './MakeKindsField';
import { More, PromptStep } from './PromptStep';
import { ALL_KINDS, kindsOf, type MakeKind } from '@/lib/makeKinds';

/** What More practice can make: questions, not reading. */
const QUESTION_KINDS: readonly MakeKind[] = ['mcq', 'flashcard', 'written'];
import { buildEvenOptionsPrompt, longestShare, optionsToRework, readEvenOptions, readEvenReply, withCorrections } from '@/lib/evenOptions';
import { analyseCourseGaps } from '@/lib/courseGaps';
import { sectionDensity } from '@/lib/sectionDensity';
import { sortedSections } from '@/lib/sortedSections';
import { examAfterAdding } from '@/lib/exam';
import { useCoursesStore } from '@/store/courses';
import { persisted } from '@/lib/safeStorage';
import { toast } from '@/store/toast';
import { Icon } from './Icon';
import { TeacherNotesField } from './TeacherNotesField';
import { cutMessage, readReply } from '@/lib/readReply';

const STORAGE_FULL =
  "Browser storage is full, so this wasn't saved. It will disappear when you reload. Export a lecture you've finished and remove it, then try again.";

export type AddMode = 'material' | 'practice' | 'explain' | 'fix' | 'options';

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
  explain: 'explanation',
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
  useDialog(onClose);
  const [mode, setMode] = useState<AddMode>(initialMode);
  const [pasted, setPasted] = useState('');
  const [notes, setNotes] = useState(course.metadata.student_notes ?? '');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  // As the lecture was made: in depth if it already teaches studies.
  const [studies, setStudies] = useState(() => hasStudies(course));
  // What to make, as the lecture was made (lib/makeKinds); More practice
  // makes questions only.
  const [kinds, setKinds] = useState<MakeKind[]>(() => kindsOf(course));
  // Written answers only when ticked, as on the practice test (the owner,
  // 2026-10-26: "I NEVER TOLD YOU TO ADD WRITTEN ANSWERS").
  // A lecture with neither keeps to what it has: written answers, or
  // nothing ticked, for the student to choose.
  const [practiceKinds, setPracticeKinds] = useState<MakeKind[]>(() => {
    const made = kindsOf(course);
    const asked = made.filter((k) => k === 'mcq' || k === 'flashcard');
    return asked.length ? asked : made.filter((k) => QUESTION_KINDS.includes(k));
  });
  const chosenKinds = mode === 'material' ? kinds : mode === 'practice' ? practiceKinds : ALL_KINDS;
  const [copied, setCopied] = useState(false);
  const mergeIntoCourse = useCoursesStore((s) => s.mergeIntoCourse);
  const updateCourse = useCoursesStore((s) => s.updateCourse);

  const firstSectionId = sortedSections(course)[0]?.id ?? 'added';

  // Re-planned on every keystroke: parsing a paste is cheap and pure, and it
  // means the preview and the error both track what's actually in the box.
  const result = useMemo((): { plan: MergePlan; cut: string | null; share?: [number, number]; skipped?: string[]; note?: string } | { error: string } | null => {
    if (!pasted.trim()) return null;

    // Even out the answers: new wrong options only, merged as corrections
    // under the same ids, with the right answer kept as it is.
    if (mode === 'options') {
      // Read line by line if the reply was cut off (lib/evenOptions readEvenReply).
      const lines = readEvenReply(pasted);
      if (!lines.ok) return { error: lines.error };
      const even = readEvenOptions(course, lines.json);
      if ('error' in even) return { error: even.error };
      const skipped = even.skipped.map((x) => `${x.id}: ${x.why}`);
      if (!even.corrections.length) return { error: `Nothing in the reply could be used:\n${skipped.join('\n')}` };
      const parsed = parseFragment({ corrections: even.corrections }, firstSectionId);
      if (!parsed.ok) return { error: parsed.error };
      return {
        plan: planMerge(course, parsed.fragment, { skipDuplicates }),
        cut: lines.cut != null ? `The reply was cut off. The ${lines.cut} question${lines.cut === 1 ? '' : 's'} before the cut can be used; copy the prompt again after applying them and the rest will be asked for.` : null,
        share: [longestShare(course), longestShare(withCorrections(course, even.corrections))],
        skipped,
      };
    }

    // Finds the JSON in a whole copied reply (the fix prompt asks for a
    // verdict list before it), and keeps what came before a cut-off.
    const read = readReply(pasted);
    if (!read.ok) return { error: read.error };

    const parsed = parseFragment(read.json, firstSectionId);
    if (!parsed.ok) return { error: parsed.error };
    const cut = read.cut ? cutMessage(read.cut) : null;

    // Explanations only: a model that adds a few questions "to check
    // understanding" would otherwise slip new scored cards in unasked.
    if (mode === 'explain') {
      const sections = (parsed.fragment.sections ?? []).map((sec) => ({ ...sec, items: sec.items.filter((i) => i.type === 'explain') }));
      const kept = sections.reduce((n, sec) => n + sec.items.length, 0);
      const all = (parsed.fragment.sections ?? []).reduce((n, sec) => n + sec.items.length, 0) + (parsed.fragment.corrections?.length ?? 0);
      if (!kept) return { error: 'The reply has no explanations in it (items of type "explain"). Copy the prompt again into the chat that wrote this lecture.' };
      return {
        plan: planMerge(course, { sections: sections.filter((sec) => sec.items.length) }, { skipDuplicates }),
        cut,
        note: all > kept ? `Left out ${plural(all - kept, 'item')} that ${all - kept === 1 ? 'is not an explanation' : 'are not explanations'}.` : undefined,
      };
    }

    return { plan: planMerge(course, parsed.fragment, { skipDuplicates }), cut };
  }, [pasted, course, firstSectionId, skipDuplicates, mode]);

  const plan = result && 'plan' in result ? result.plan : null;
  const canApply = !!plan && plan.totalAdded + plan.totalCorrected > 0;

  const gaps = useMemo(() => analyseCourseGaps(course), [course]);
  // The same list the More practice prompt puts first (buildPractisePrompt).
  const sparse = useMemo(() => sectionDensity(course)?.sparse ?? [], [course]);
  const fixes = useMemo(() => planFixes(course), [course]);
  const rework = useMemo(() => optionsToRework(course), [course]);
  const shareNow = useMemo(() => longestShare(course), [course]);
  const explained = useMemo(() => course.sections.reduce((n, s) => n + s.items.filter((i) => i.type === 'explain' && !i.set_aside).length, 0), [course]);

  const copyPrompt = async () => {
    // Kept on the lecture, so the next prompt for it carries them too.
    const kept = notes.trim();
    if (kept !== (course.metadata.student_notes ?? '')) {
      updateCourse(courseId, { ...course, metadata: { ...course.metadata, student_notes: kept || undefined } });
    }
    const prompt =
      mode === 'options'
        ? buildEvenOptionsPrompt(course, kept)
        : mode === 'fix'
        ? buildFixPrompt(course, kept)
        : mode === 'practice'
          ? buildPractisePrompt(course, kept, practiceKinds)
          : mode === 'explain'
            ? buildExplainPrompt(course, kept)
            : buildAddPrompt(course, kept, studies, kinds);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked without a secure context or permission. Don't
      // strand the student — hand them the text to copy by hand.
      setPasted('');
      toast('Clipboard blocked, so the prompt opened in a new tab instead.', { type: 'info' });
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<pre style="white-space:pre-wrap;font:13px/1.5 system-ui;padding:16px">${
          prompt.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))
        }</pre>`);
        w.document.close();
      }
    }
  };

  /** New sections and an upcoming exam: say whether they count, and let one tap flip it. */
  const askAboutExam = (ids: string[], titles: string[]) => {
    const current = useCoursesStore.getState().courses[courseId];
    const decision = current && examAfterAdding(current, ids, Date.now());
    if (!current || !decision) return;
    const setSections = (examSections: string[]) => {
      const latest = useCoursesStore.getState().courses[courseId];
      if (latest) updateCourse(courseId, withExamSections(latest, examSections, Date.now()));
    };
    setSections(decision.examSections);
    const name = titles.length === 1 ? `“${titles[0]}”` : `${titles.length} new sections`;
    const flipped = decision.included
      ? decision.examSections.filter((id) => !ids.includes(id))
      : [...decision.examSections, ...ids];
    toast(decision.included ? `${name} counted as on your exam.` : `${name} not counted for your exam (it’s in the last week).`, {
      type: 'info',
      duration: 12000,
      actionLabel: decision.included ? 'Not on it' : 'It’s on it',
      onAction: () => setSections(flipped),
    });
  };

  const confirm = () => {
    if (!plan) return;
    const { ok } = persisted(() => mergeIntoCourse(courseId, plan));
    if (!ok) {
      toast(STORAGE_FULL, { type: 'error', duration: 12000 });
      onClose();
      return;
    }
    const newSections = plan.sections.filter((s) => s.isNew && s.added.length > 0);
    askAboutExam(newSections.map((s) => s.id), newSections.map((s) => s.title));
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
    material: 'Add material to this lecture',
    practice: 'More practice on this lecture',
    explain: 'Add explanations',
    fix: 'Fix what the check found',
    options: 'Even out the answers',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${MODE_TITLES[mode]}: ${course.metadata.title}`}
    >
      <div className="my-8 w-full max-w-2xl paper-grain rounded-sm border border-border-strong bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold text-text">{MODE_TITLES[mode]}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-safe -m-2 p-2 text-text-3 hover:text-text"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-x-1 border-b border-border px-5 pt-3" role="tablist">
          {(
            [
              ['material', 'New material'],
              ['practice', 'More practice'],
              ['explain', 'Explanations'],
              ['fix', 'Fix gaps'],
              ['options', 'Even out answers'],
            ] as const
          )
            .filter(([value]) => value !== 'options' || rework.length > 0 || mode === 'options')
            .map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                setMode(value);
                setCopied(false);
              }}
              className={`shrink-0 whitespace-nowrap rounded-t px-3 py-1.5 text-sm ${
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
          {/* What it is for, in a line, and where to paste it; the rest folds. */}
          <PromptStep n={1} title="Copy the prompt">
            {mode === 'material' ? (
              <>
                <p className="text-sm text-text-2">
                  For new notes, such as next week&rsquo;s lecture. Paste the prompt into an AI with the new notes
                  attached to the same message.
                </p>
                <More label="More about this">
                  <p>
                    The prompt tells the AI which sections, ids and tags this lecture uses, so nothing is made twice.
                    Attach the files to the message itself: files kept only in a project often lose their diagrams.
                  </p>
                </More>
              </>
            ) : mode === 'options' ? (
              <>
                <p className="text-sm text-text-2">
                  In {plural(rework.length, 'question')} the right answer is the longest option, so it can be guessed.
                  This asks only for new wrong answers. <strong>Paste it into the chat that made this lecture.</strong>
                </p>
                <More label="More about this">
                  <p>
                    Guessing the longest option gets {shareNow}% of this lecture&rsquo;s questions right; fair is about
                    25%. The questions, their right answers and your scores stay as they are.
                  </p>
                </More>
              </>
            ) : mode === 'explain' ? (
              <>
                <p className="text-sm text-text-2">
                  A short explanation of each key idea, shown in Learn before the questions on it.{' '}
                  <strong>Paste it into the chat that made this lecture.</strong>
                </p>
                <More label="More about this">
                  <p>
                    {explained > 0 ? `This lecture has ${plural(explained, 'explanation')} already; the prompt asks only for the ones missing. ` : ''}
                    Your questions and scores stay as they are.
                  </p>
                </More>
              </>
            ) : mode === 'fix' ? (
              <>
                <p className="text-sm text-text-2">
                  Sends what the lecture check found back to the AI to fix.{' '}
                  <strong>Paste it into the chat that made this lecture</strong>, where your notes still are.
                </p>
                <More label="More about this">
                  <p>
                    Only your notes can say whether a missing term mattered, so the AI judges each one first. It is
                    told that &ldquo;not worth a card&rdquo; is a fine answer, so a term your notes only mention in
                    passing is skipped with a reason rather than padded out.
                  </p>
                </More>
              </>
            ) : (
              <>
                <p className="text-sm text-text-2">
                  New questions on what this lecture already covers, for when you know the ones you have.{' '}
                  <strong>Paste it into the chat that made this lecture</strong>, where your notes still are.
                </p>
                <More label="More about this">
                  <p>
                    In another chat it writes from the passages each card quoted from your notes, which works but
                    misses what no card quoted.
                  </p>
                </More>
              </>
            )}
            <div className="mt-3" />

            {mode === 'fix' &&
              (fixes.empty ? (
                <div className="mb-2 border-l-2 border-border py-1.5 pl-3 text-sm text-text-2">
                  The check found nothing to fix. Every term the generator listed has a definition,
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
                          : {fixes.missingTerms.slice(0, 4).join(', ')}
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
                    {fixes.thinKeyTerms.length > 0 && (
                      <li>
                        ask {plural(fixes.thinKeyTerms.length, 'key term')} from other sides, each
                        asked by only one card now
                      </li>
                    )}
                    {fixes.faultyItems.length > 0 && (
                      <li>
                        repair {plural(fixes.faultyItems.length, 'card')}
                        {fixes.totalFaulty > fixes.faultyItems.length &&
                          ` (the most serious of ${fixes.totalFaulty}; run this again afterwards for the rest)`}
                        : broken answer keys first, then answers that give themselves away by length,
                        questions that point at your notes instead of the subject, questions that only ask a
                        term back from its definition, questions that repeat another in nearly the same
                        words, and definitions that spell out their own term
                      </li>
                    )}
                  </ul>
                </div>
              ))}

            {mode === 'practice' &&
              (gaps.untestedTerms.length > 0 ||
                sparse.length > 0 ||
                gaps.thinKeyTerms.length > 0 ||
                gaps.thinSections.length > 0 ||
                gaps.gradableRatio < 0.5) && (
                <div className="mb-2 border-l-2 border-border py-1.5 pl-3 text-sm text-text-2">
                  <div className="mb-1 font-medium text-text">The prompt will prioritise:</div>
                  <ul className="list-inside list-disc space-y-0.5">
                    {sparse.length > 0 && (
                      <li>
                        {plural(sparse.length, 'section')} with few items for {sparse.length === 1 ? 'its' : 'their'} slides
                        <span className="text-text-3">
                          : {sparse.slice(0, 3).map((x) => `${x.title} (${x.items} for ${x.slides})`).join(', ')}
                          {sparse.length > 3 ? '…' : ''}
                        </span>
                      </li>
                    )}
                    {gaps.untestedTerms.length > 0 && (
                      <li>
                        {plural(gaps.untestedTerms.length, 'term')} defined but never tested
                        <span className="text-text-3">
                          : {gaps.untestedTerms.slice(0, 4).join(', ')}
                          {gaps.untestedTerms.length > 4 ? '…' : ''}
                        </span>
                      </li>
                    )}
                    {gaps.thinKeyTerms.length > 0 && (
                      <li>
                        {plural(gaps.thinKeyTerms.length, 'key term')} asked only one way
                        <span className="text-text-3">
                          : {gaps.thinKeyTerms.slice(0, 4).join(', ')}
                          {gaps.thinKeyTerms.length > 4 ? '…' : ''}
                        </span>
                      </li>
                    )}
                    {gaps.thinSections.length > 0 && (
                      <li>
                        {plural(gaps.thinSections.length, 'section')} with little that can be scored
                        <span className="text-text-3">
                          : {gaps.thinSections.slice(0, 3).map((x) => x.title).join(', ')}
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
            {(mode === 'material' || mode === 'practice') && (
              <div className="mb-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-3">What to make</div>
                {mode === 'material' ? (
                  <MakeKindsField value={kinds} onChange={setKinds} />
                ) : (
                  <MakeKindsField value={practiceKinds} onChange={setPracticeKinds} only={QUESTION_KINDS} />
                )}
              </div>
            )}
            <button type="button" onClick={copyPrompt} disabled={!chosenKinds.length} className="press">
              <Icon name={copied ? 'check-circle' : 'clipboard'} size={14} />
              {copied ? 'Prompt copied' : 'Copy the prompt'}
            </button>
            <More label="More options">
              <TeacherNotesField value={notes} onChange={setNotes} />
              {mode === 'material' && <StudiesField checked={studies} onChange={setStudies} />}
            </More>
          </PromptStep>

          <PromptStep n={2} title="Paste the reply">
            <label className="block">
              <span className="sr-only">The AI&rsquo;s reply</span>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={8}
                spellCheck={false}
                placeholder="Paste the AI’s whole reply here"
                className="field w-full font-mono text-xs"
              />
            </label>
            {/* A long reply is easier to save and open than to select and
                copy on a phone. The file's text goes through the same box. */}
            <div className="mt-2 text-sm text-text-3">
              …or{' '}
              <label className="cursor-pointer text-accent hover:underline">
                upload a file instead
                <input
                  type="file"
                  accept=".json,.txt,application/json,text/plain"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) setPasted(await file.text());
                  }}
                />
              </label>
            </div>
          </PromptStep>

          {/* Feedback */}
          {result && 'error' in result && (
            <div
              role="alert"
              className="whitespace-pre-wrap border-l-2 border-error py-2 pl-3 text-sm text-error"
            >
              {result.error}
            </div>
          )}

          {result && 'cut' in result && result.cut && (
            <div role="status" className="border-l-2 border-warning py-2 pl-3 text-sm text-text-2">
              {result.cut}
            </div>
          )}
          {result && 'note' in result && result.note && (
            <div role="status" className="border-l-2 border-border py-2 pl-3 text-sm text-text-2">
              {result.note}
            </div>
          )}

          {plan && (
            <div className="border-l-2 border-border-strong bg-bg py-2 pl-3 text-sm">
              {plan.totalAdded === 0 && plan.totalCorrected === 0 ? (
                <div className="text-text-2">
                  Nothing new to add
                  {plan.totalDuplicates > 0
                    ? `. All ${plural(plan.totalDuplicates, 'item')} already exist in this lecture.`
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
                        <span className="text-text-3">: changes {c.changed.join(', ')}</span>
                      </li>
                    ))}
                    {plan.corrections.length > 8 && (
                      <li className="text-text-3">+{plan.corrections.length - 8} more</li>
                    )}
                  </ul>
                  <div className="mt-1 text-xs text-text-3">
                    Each keeps its id, so your progress on it is kept too.
                  </div>
                  {result && 'share' in result && result.share && (
                    <div className="mt-1.5 text-text-2">
                      Guessing the longest option: {result.share[0]}% right now, {result.share[1]}% after.
                    </div>
                  )}
                  {result && 'skipped' in result && result.skipped && result.skipped.length > 0 && (
                    <div className="mt-1 text-text-3">Not used: {result.skipped.join('; ')}.</div>
                  )}
                </div>
              )}

              {plan.unmatchedCorrections.length > 0 && (
                <div className="mt-1.5 text-text-3">
                  Ignoring {plural(plan.unmatchedCorrections.length, 'correction')} for{' '}
                  {plan.unmatchedCorrections.length === 1 ? 'an id' : 'ids'} this lecture
                  doesn&rsquo;t have ({plan.unmatchedCorrections.slice(0, 3).join(', ')}
                  {plan.unmatchedCorrections.length > 3 ? '…' : ''}).
                </div>
              )}

              {plan.totalDuplicates > 0 && plan.totalAdded > 0 && (
                <div className="mt-1.5 text-text-3">
                  Skipping {plural(plan.totalDuplicates, 'item')} already in this lecture.
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
              Skip items this lecture already covers
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
                  .replace(/^./, (c) => c.toUpperCase())
              : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
