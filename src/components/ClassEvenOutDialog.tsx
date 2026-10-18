import { useMemo, useState } from 'react';
import type { Course } from '@/schema/course';
import { useDialog } from '@/lib/useDialog';
import { buildClassEvenOptionsPrompt, classToRework, longestShare, readClassEvenOptions, readEvenReply } from '@/lib/evenOptions';
import { lecturesOf } from '@/lib/classExams';
import { parseFragment } from '@/schema/fragment';
import { planMerge } from '@/lib/mergeFragment';
import { sortedSections } from '@/lib/sortedSections';
import { lectureName } from '@/lib/classExams';
import { persisted } from '@/lib/safeStorage';
import { useCoursesStore } from '@/store/courses';
import { toast } from '@/store/toast';
import { Icon } from './Icon';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Even out the answers (lib/evenOptions.ts) for every lecture of a class in
 * one prompt and one reply. Each question carries the passage from the notes
 * it came from, so the prompt works in any chat; the reply is checked per
 * lecture, previewed, and merged into each as corrections under the same ids.
 */
export function ClassEvenOutDialog({ code, lectures, onClose }: { code: string; lectures: [string, Course][]; onClose: () => void }) {
  useDialog(onClose);
  const mergeIntoCourse = useCoursesStore((s) => s.mergeIntoCourse);
  const todo = useMemo(() => classToRework(lectures), [lectures]);
  const total = todo.reduce((n, l) => n + l.count, 0);
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');

  const read = useMemo(() => (pasted.trim() ? readEvenReply(pasted) : null), [pasted]);
  const result = useMemo(() => {
    if (!read) return null;
    if (!read.ok) return { error: read.error };
    return readClassEvenOptions(lectures, read.json);
  }, [read, lectures]);
  const fixes = result && !('error' in result) ? result.lectures.filter((l) => l.corrections.length > 0) : [];
  const fixing = fixes.reduce((n, l) => n + l.corrections.length, 0);

  const copy = async () => {
    const prompt = buildClassEvenOptionsPrompt(code, lectures);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: show it to select by hand.
      setManual(prompt);
    }
  };

  const apply = () => {
    if (!read?.ok) return;
    // Built again from the lectures as they are now: one edited or fixed in
    // another tab since the paste keeps those edits, and only its wrong
    // options change.
    const current = lecturesOf(useCoursesStore.getState().courses, code);
    const now = readClassEvenOptions(current, read.json);
    if ('error' in now) {
      toast(now.error, { type: 'error' });
      return;
    }
    let questions = 0;
    let changed = 0;
    const { ok } = persisted(() => {
      for (const l of now.lectures) {
        const course = useCoursesStore.getState().courses[l.id];
        if (!course || !l.corrections.length) continue;
        const parsed = parseFragment({ corrections: l.corrections }, sortedSections(course)[0]?.id ?? 'added');
        if (!parsed.ok) continue;
        const plan = planMerge(course, parsed.fragment);
        if (!plan.totalCorrected) continue;
        mergeIntoCourse(l.id, plan);
        questions += plan.totalCorrected;
        changed++;
      }
    });
    if (!ok) {
      toast("Browser storage is full, so this wasn't saved. Back up (Help), then remove a lecture you no longer need.", { type: 'error', duration: 12000 });
    } else if (!questions) {
      toast('Nothing was changed: none of the questions in the reply could be used any more.', { type: 'error' });
    } else {
      toast(`Evened out ${plural(questions, 'question')} in ${plural(changed, 'lecture')}. Your scores on them are kept.`, { type: 'success' });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Even out the answers: ${code}`}
    >
      <div className="my-8 w-full max-w-2xl paper-grain rounded-sm border border-border-strong bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold text-text">Even out the answers: {code}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="tap-safe -m-2 p-2 text-text-3 hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4 text-sm">
          <section>
            <h3 className="mark mb-1.5 text-text-3">Step 1: copy the prompt</h3>
            <p className="mb-2 text-text-2">
              In {plural(total, 'question')} across {plural(todo.length, 'lecture')} the right answer is the longest option, so
              you could pick it without knowing the material. One prompt asks for new wrong answers to all of them. Each
              question carries the passage from your notes it came from, so any chat can answer it. The questions, their right
              answers and your scores stay as they are.
            </p>
            <ul className="mb-3 border-y border-border">
              {todo.map((l) => (
                <li key={l.id} className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 last:border-b-0">
                  <span className="text-text">{lectureName(l.course.metadata.title, code)}</span>
                  <span className="shrink-0 tabular-nums text-text-3">
                    {plural(l.count, 'question')} · {longestShare(l.course)}% longest
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={copy} className="press">
              <Icon name={copied ? 'check-circle' : 'clipboard'} size={14} />
              {copied ? 'Prompt copied' : 'Copy prompt'}
            </button>
            {manual && (
              <textarea readOnly value={manual} rows={6} className="field mt-2 w-full font-mono text-xs" onFocus={(e) => e.target.select()} />
            )}
          </section>

          <section>
            <label className="block">
              <span className="mark mb-1.5 block text-text-3">Step 2: paste the reply</span>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={6}
                spellCheck={false}
                placeholder={'{\n"<lecture id>": {\n"<question id>": {"wrong": […], "why": […]},\n…'}
                className="field w-full font-mono text-xs"
              />
            </label>
            <div className="mt-2 text-text-3">
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
          </section>

          {result && 'error' in result && (
            <div role="alert" className="whitespace-pre-wrap border-l-2 border-error py-2 pl-3 text-error">
              {result.error}
            </div>
          )}

          {read?.ok && read.cut != null && (
            <div role="status" className="border-l-2 border-warning py-2 pl-3 text-text-2">
              The reply was cut off. The {plural(read.cut, 'question')} before the cut can be used; copy the prompt again after
              applying them and the rest will be asked for.
            </div>
          )}

          {result && !('error' in result) && (
            <div className="border-l-2 border-border-strong py-2 pl-3">
              {result.lectures.map((l) => (
                <div key={l.id} className="mb-1.5">
                  <span className="text-text">{lectureName(l.title, code)}</span>
                  <span className="text-text-2">
                    : {l.error ?? (l.corrections.length ? `${plural(l.corrections.length, 'question')} evened out, right answer longest ${l.before}% → ${l.after}%` : 'nothing usable')}
                  </span>
                  {l.skipped.length > 0 && (
                    <div className="text-text-3">Not used: {l.skipped.map((x) => `${x.id} (${x.why})`).join('; ')}.</div>
                  )}
                </div>
              ))}
              {result.unknown.length > 0 && <div className="text-text-3">No lecture here has the id {result.unknown.join(', ')}.</div>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="press">
            Cancel
          </button>
          <button type="button" onClick={apply} disabled={fixing === 0} className="press press-ink">
            {fixing ? `Even out ${plural(fixing, 'question')}` : 'Even out'}
          </button>
        </div>
      </div>
    </div>
  );
}
