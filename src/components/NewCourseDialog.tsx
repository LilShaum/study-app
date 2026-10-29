import { useMemo, useState, type ChangeEvent } from 'react';
import { useDialog } from '@/lib/useDialog';
import { useNavigate } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { parseCourse } from '@/schema/parseCourse';
import { buildNewCoursePrompt } from '@/lib/buildNewCoursePrompt';
import { useCoursesStore } from '@/store/courses';
import { beginWriteCheck, persisted, writesLanded } from '@/lib/safeStorage';
import { toast } from '@/store/toast';
import { Icon } from './Icon';
import { TeacherNotesField } from './TeacherNotesField';
import { StudiesField } from './StudiesField';
import { MakeKindsField } from './MakeKindsField';
import { More, PromptStep } from './PromptStep';
import { ALL_KINDS, storedKinds, type MakeKind } from '@/lib/makeKinds';
import { cutMessage, readReply } from '@/lib/readReply';

const STORAGE_FULL =
  "Browser storage is full, so this wasn't saved. It will disappear when you reload. Export a lecture you've finished and remove it, then try again.";

interface NewCourseDialogProps {
  onClose: () => void;
  /** Adding a lecture to a class: the lecture gets this class code, whatever the file says. */
  classCode?: string;
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
 * "New course" — the missing first step.
 *
 * The app could always open a `.study.json`, but never said where one comes
 * from: the empty state told you to upload a file and the generator spec
 * existed only as a file in the repo, so you had to already know about
 * prompts/generator.md to get started at all. This hands you the prompt.
 *
 * Step 2 accepts a paste as well as a file, because the generator returns JSON
 * in a chat window — making you save it to disk first is a step that buys
 * nothing.
 */
export function NewCourseDialog({ onClose, classCode }: NewCourseDialogProps) {
  useDialog(onClose);
  const [pasted, setPasted] = useState('');
  const [notes, setNotes] = useState('');
  const [studies, setStudies] = useState(false);
  // Everything, unless the student unticks a kind (lib/makeKinds).
  const [kinds, setKinds] = useState<MakeKind[]>(ALL_KINDS);
  const [copied, setCopied] = useState(false);
  const lectures = useCoursesStore((s) => s.courses);
  // In a class, the lecture added last is the likeliest one this deck follows.
  const [after, setAfter] = useState(() => {
    if (!classCode) return '';
    const inClass = Object.entries(lectures).filter(([, c]) => c.metadata.course_code?.trim() === classCode);
    return inClass.at(-1)?.[0] ?? '';
  });
  const addCourse = useCoursesStore((s) => s.addCourse);
  const importCourse = useCoursesStore((s) => s.importCourse);
  const navigate = useNavigate();

  // Parsed on every keystroke so the preview and the error both track the box.
  const result = useMemo((): { course: Course; cut: string | null } | { error: string } | null => {
    if (!pasted.trim()) return null;
    // Finds the JSON in a whole copied reply, and keeps what came before a
    // cut-off (lib/readReply).
    const read = readReply(pasted);
    if (!read.ok) return { error: read.error };
    const parsed = parseCourse(read.json);
    return parsed.ok ? { course: parsed.course, cut: read.cut ? cutMessage(read.cut) : null } : { error: parsed.error };
  }, [pasted]);

  const course = result && 'course' in result ? result.course : null;

  const copyPrompt = async () => {
    const prompt = buildNewCoursePrompt(notes, after ? lectures[after] : undefined, studies, kinds);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard (insecure context, permission denied) — don't strand the
      // user with nothing; give them the text to copy by hand.
      toast('Clipboard blocked, so the prompt opened in a new tab instead.', { type: 'info' });
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
    if (saved) toast(`"${title || 'Lecture'}" added.`, { type: 'success' });
    else toast(STORAGE_FULL, { type: 'error', duration: 12000 });
    onClose();
    navigate(`/study/${id}`);
  };

  const confirmPaste = () => {
    if (!course) return;
    const placed = {
      ...course,
      metadata: {
        ...course.metadata,
        ...(classCode ? { course_code: classCode } : {}),
        // Written before the prompt was copied; kept for every later prompt.
        ...(notes.trim() ? { student_notes: notes.trim() } : {}),
        // What it was made with, so Add material, More practice and Fix keep to it.
        ...(storedKinds(kinds) ? { make: storedKinds(kinds) } : {}),
      },
    };
    const { result: id, ok } = persisted(() => addCourse(placed));
    openCourse(id, course.metadata.title, ok);
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    beginWriteCheck();
    const imported = await importCourse(file);
    const ok = writesLanded();
    const make = storedKinds(kinds);
    if (imported.ok && (classCode || make)) {
      const added = useCoursesStore.getState().courses[imported.id];
      if (added)
        useCoursesStore.getState().updateCourse(imported.id, {
          ...added,
          metadata: { ...added.metadata, ...(classCode ? { course_code: classCode } : {}), ...(make ? { make } : {}) },
        });
    }
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
      aria-label="Create a new lecture"
    >
      <div className="my-8 w-full max-w-2xl paper-grain rounded-sm border border-border-strong bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold text-text">{classCode ? `New lecture for ${classCode}` : 'New lecture'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="tap-safe -m-2 p-2 text-text-3 hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-6 px-5 py-4">
          <PromptStep n={1} title="What to make">
            <MakeKindsField value={kinds} onChange={setKinds} />
            <p className="mt-1 text-xs text-text-3">Untick what you don&rsquo;t want. Fewer kinds is a shorter reply.</p>
            <div className="mt-3">
              <StudiesField checked={studies} onChange={setStudies} />
            </div>
            <More label="More options">
              <div className="space-y-3">
                <TeacherNotesField value={notes} onChange={setNotes} />
                {Object.keys(lectures).length > 0 && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-3">
                      Follows on from
                    </span>
                    <span className="mb-1.5 block text-sm text-text-2">
                      If this starts with slides from the end of another lecture, pick it, so they aren&rsquo;t made twice.
                    </span>
                    <select value={after} onChange={(e) => setAfter(e.target.value)} className="field w-full text-sm">
                      <option value="">None</option>
                      {Object.entries(lectures).map(([id, c]) => (
                        <option key={id} value={id}>
                          {c.metadata.title}
                          {c.metadata.course_code ? ` · ${c.metadata.course_code}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </More>
          </PromptStep>

          <PromptStep n={2} title="Copy the prompt">
            <p className="mb-3 text-sm text-text-2">
              Paste it into Claude or another AI, and attach your slides, notes or PDF to the same message.
            </p>
            <button type="button" onClick={copyPrompt} disabled={!kinds.length} className="press">
              <Icon name={copied ? 'check-circle' : 'clipboard'} size={14} />
              {copied ? 'Prompt copied' : 'Copy the prompt'}
            </button>
            <More label="Why attach them to the message?">
              <p>
                Files kept only in a project often reach the AI as text, without their diagrams, and the lecture then
                misses what the diagrams show. The prompt has the AI list every term and idea in your material first, so
                the lecture covers all of it rather than skimming.
              </p>
            </More>
          </PromptStep>

          <PromptStep n={3} title="Paste the reply">
            <label className="block">
              <span className="sr-only">The AI&rsquo;s reply</span>
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={6}
                spellCheck={false}
                placeholder="Paste the AI’s whole reply here"
                className="field w-full font-mono text-xs"
              />
            </label>
            <div className="mt-2 text-sm text-text-3">
              …or{' '}
              <label className="cursor-pointer text-accent hover:underline">
                upload a file instead
                <input type="file" accept=".json,.study.json" className="hidden" onChange={handleFile} />
              </label>
            </div>
          </PromptStep>

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

          {course && (
            <div className="border-l-2 border-border-strong bg-bg py-2 pl-3 text-sm">
              <div className="font-medium text-text">
                {course.metadata.title || 'Untitled lecture'}
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
            Add lecture
          </button>
        </div>
      </div>
    </div>
  );
}

