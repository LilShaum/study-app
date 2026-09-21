import { useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { parseCourse } from '@/schema/parseCourse';
import { buildNewCoursePrompt } from '@/lib/buildNewCoursePrompt';
import { useCoursesStore } from '@/store/courses';
import { beginWriteCheck, persisted, writesLanded } from '@/lib/safeStorage';
import { toast } from '@/store/toast';
import { Icon } from './Icon';

const STORAGE_FULL =
  "Browser storage is full, so this wasn't saved — it will disappear when you reload. Export a course you've finished and remove it, then try again.";

interface NewCourseDialogProps {
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
 * "New course" — the missing first step.
 *
 * The app could always open a `.study.json`, but never said where one comes
 * from: the empty state told you to upload a file and the generator spec
 * existed only as a file in the repo, so you had to already know about
 * CLAUDE.md to get started at all. This hands you the prompt.
 *
 * Step 2 accepts a paste as well as a file, because the generator returns JSON
 * in a chat window — making you save it to disk first is a step that buys
 * nothing.
 */
export function NewCourseDialog({ onClose }: NewCourseDialogProps) {
  const [pasted, setPasted] = useState('');
  const [copied, setCopied] = useState(false);
  const addCourse = useCoursesStore((s) => s.addCourse);
  const importCourse = useCoursesStore((s) => s.importCourse);
  const navigate = useNavigate();

  // Parsed on every keystroke so the preview and the error both track the box.
  const result = useMemo((): { course: Course } | { error: string } | null => {
    const text = pasted.trim();
    if (!text) return null;
    const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let json: unknown;
    try {
      json = JSON.parse(unfenced);
    } catch (e) {
      return { error: `That isn't valid JSON — ${(e as Error).message}` };
    }
    const parsed = parseCourse(json);
    return parsed.ok ? { course: parsed.course } : { error: parsed.error };
  }, [pasted]);

  const course = result && 'course' in result ? result.course : null;

  const copyPrompt = async () => {
    const prompt = buildNewCoursePrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard (insecure context, permission denied) — don't strand the
      // user with nothing; give them the text to copy by hand.
      toast('Clipboard blocked — the prompt was opened in a new tab instead.', { type: 'info' });
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(
          `<pre style="white-space:pre-wrap;font:13px/1.5 system-ui;padding:16px">${prompt.replace(
            /[<&]/g,
            (c) => (c === '<' ? '&lt;' : '&amp;'),
          )}</pre>`,
        );
        w.document.close();
      }
    }
  };

  const openCourse = (id: string, title: string, saved: boolean) => {
    // Never announce a save that didn't happen — see safeStorage.persisted.
    if (saved) toast(`"${title || 'Course'}" added.`, { type: 'success' });
    else toast(STORAGE_FULL, { type: 'error', duration: 12000 });
    onClose();
    navigate(`/study/${id}`);
  };

  const confirmPaste = () => {
    if (!course) return;
    const { result: id, ok } = persisted(() => addCourse(course));
    openCourse(id, course.metadata.title, ok);
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    beginWriteCheck();
    const imported = await importCourse(file);
    const ok = writesLanded();
    if (imported.ok) openCourse(imported.id, imported.course.metadata.title, ok);
    else toast(imported.error, { type: 'error' });
  };

  const counts: Record<string, number> = {};
  let itemTotal = 0;
  if (course) {
    for (const section of course.sections) {
      for (const item of section.items) {
        counts[item.type] = (counts[item.type] ?? 0) + 1;
        itemTotal++;
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create a new course"
    >
      <div className="my-8 w-full max-w-2xl rounded-sm border border-border-strong bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold text-text">New course</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-3 hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <section>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-3">
              Step 1 — generate
            </div>
            <p className="mb-2 text-sm text-text-2">
              Copy this prompt into an AI chat, attach your slides, PDF or notes, and it will return
              a course. The prompt is the full generator spec — it tells the model to inventory
              every term, objective and formula in your notes first, so the result covers the
              material rather than skimming it.
            </p>
            <button
              type="button"
              onClick={copyPrompt}
              className="press"
            >
              <Icon name={copied ? 'check-circle' : 'clipboard'} size={14} />
              {copied ? 'Prompt copied' : 'Copy generator prompt'}
            </button>
          </section>

          <section>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-3">
                Step 2 — paste the course back
              </span>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={8}
                spellCheck={false}
                placeholder={'{\n  "schema_version": "1.0",\n  "metadata": { … },\n  "sections": [ … ]\n}'}
                className="field w-full font-mono text-xs"
              />
            </label>
            <div className="mt-2 text-sm text-text-3">
              …or{' '}
              <label className="cursor-pointer text-accent hover:underline">
                open a .study.json file
                <input type="file" accept=".json,.study.json" className="hidden" onChange={handleFile} />
              </label>{' '}
              if you saved it.
            </div>
          </section>

          {result && 'error' in result && (
            <div
              role="alert"
              className="whitespace-pre-wrap border-l-2 border-error py-2 pl-3 text-sm text-error"
            >
              {result.error}
            </div>
          )}

          {course && (
            <div className="border-l-2 border-border-strong bg-bg py-2 pl-3 text-sm">
              <div className="font-medium text-text">
                {course.metadata.title || 'Untitled course'}
                {course.metadata.course_code && (
                  <span className="font-normal text-text-3"> · {course.metadata.course_code}</span>
                )}
              </div>
              <div className="mt-0.5 text-text-2">
                {plural(course.sections.length, 'section')}, {plural(itemTotal, 'item')}
                {Object.keys(counts).length > 0 && (
                  <span className="text-text-3">
                    {' '}
                    ({Object.entries(counts)
                      .map(([type, n]) => plural(n, TYPE_LABELS[type] ?? type))
                      .join(', ')})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm text-text-2 hover:text-text">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmPaste}
            disabled={!course}
            className="press press-ink"
          >
            Add course
          </button>
        </div>
      </div>
    </div>
  );
}
