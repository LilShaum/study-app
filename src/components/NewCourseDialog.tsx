import { closeClass, normalizeCourseCode } from '@/lib/courseCode';
import { classOf } from '@/lib/classExams';
import { useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { parseCourse } from '@/schema/parseCourse';
import { buildNewCoursePrompt } from '@/lib/buildNewCoursePrompt';
import { useCoursesStore } from '@/store/courses';
import { persisted } from '@/lib/safeStorage';
import { toast } from '@/store/toast';
import { Icon } from './Icon';
import { TeacherNotesField } from './TeacherNotesField';
import { MoreContextField, StudiesField } from './StudiesField';
import { MakeKindsField } from './MakeKindsField';
import { More, PromptBody, PromptStep, Row, Rows } from './PromptStep';
import { Sheet } from './Sheet';
import { ALL_KINDS, storedKinds, type MakeKind } from '@/lib/makeKinds';
import { cutMessage, readReply } from '@/lib/readReply';
import { toastNotesFromAI } from '@/lib/notesFromAI';
import { plural } from '@/lib/plural';

const STORAGE_FULL =
  "Browser storage is full, so this wasn't saved. It will disappear when you reload. Export a lecture you've finished and remove it, then try again.";

interface NewCourseDialogProps {
  onClose: () => void;
  /** Adding a lecture to a class: the lecture gets this class code, whatever the file says. */
  classCode?: string;
}

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  multi: 'select-all question',
  flashcard: 'flashcard',
  definition: 'definition',
  example: 'example',
  explain: 'explanation',
  problem: 'problem',
  graphic: 'diagram',
};

/**
 * "New course" — the missing first step.
 *
 * The app could always open a `.study.json`, but never said where one comes
 * from: the empty state told you to upload a file and the generator spec
 * existed only as a file in the repo, so you had to already know about
 * prompts/generator.md to get started at all. This hands you the prompt.
 *
 * Step 3 takes the file the AI made; the prompt asks it to hand one back.
 */
export function NewCourseDialog({ onClose, classCode }: NewCourseDialogProps) {
  const [pasted, setPasted] = useState('');
  const [notes, setNotes] = useState('');
  const [studies, setStudies] = useState(false);
  const [moreContext, setMoreContext] = useState(false);
  // Everything, unless the student unticks a kind (lib/makeKinds).
  const [kinds, setKinds] = useState<MakeKind[]>(ALL_KINDS);
  const [copied, setCopied] = useState(false);
  const lectures = useCoursesStore((s) => s.courses);
  // In a class, the lecture added last is the likeliest one this deck follows.
  const [after, setAfter] = useState(() => {
    if (!classCode) return '';
    const inClass = Object.entries(lectures).filter(([, c]) => classOf(c) === normalizeCourseCode(classCode));
    return inClass.at(-1)?.[0] ?? '';
  });
  const addCourse = useCoursesStore((s) => s.addCourse);
  const navigate = useNavigate();
  /*
   * Which class it belongs to, asked here and stamped on the lecture whatever
   * the AI wrote: notes often never say their class, and a lecture with the
   * AI's guess, or none, landed away from its class (the owner, 2026-11-11:
   * "it would now know no matter what"). From a class's page it is set already.
   */
  const classes = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const c of Object.values(lectures)) {
      const code = c.metadata.course_code?.trim();
      const key = classOf(c);
      if (code && key && !byKey.has(key)) byKey.set(key, code);
    }
    return [...byKey.values()].sort();
  }, [lectures]);
  const [klass, setKlass] = useState<string>('');
  const [typing, setTyping] = useState(false);
  const picked = classCode ?? (klass.trim() || undefined);
  // The file's own code, when no class was picked, checked against the
  // library's: "PSYC351C" from the AI for the student's "PSYC 351" is the
  // same class, asked about once in the preview (onboarding.md, option C).
  const [keepOwn, setKeepOwn] = useState(false);

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
    const prompt = buildNewCoursePrompt(notes, after ? lectures[after] : undefined, studies, kinds, moreContext);
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

  const openCourse = (id: string, title: string, saved: boolean, notesCourse?: Course) => {
    // Never announce a save that didn't happen — see safeStorage.persisted.
    if (saved) toast(`"${title || 'Lecture'}" added.`, { type: 'success' });
    else toast(STORAGE_FULL, { type: 'error', duration: 12000 });
    if (notesCourse) toastNotesFromAI(notesCourse);
    onClose();
    navigate(`/study/${id}`);
  };

  const nearClass = !picked && course ? closeClass(course.metadata.course_code, classes) : null;
  const stamped = picked ?? (nearClass && !keepOwn ? nearClass : undefined);

  const confirmPaste = () => {
    if (!course) return;
    const placed = {
      ...course,
      metadata: {
        ...course.metadata,
        ...(stamped ? { course_code: stamped } : {}),
        // Written before the prompt was copied; kept for every later prompt.
        ...(notes.trim() ? { student_notes: notes.trim() } : {}),
        // What it was made with, so Add material, More practice and Fix keep to it.
        ...(storedKinds(kinds) ? { make: storedKinds(kinds) } : {}),
      },
    };
    const { result: id, ok } = persisted(() => addCourse(placed));
    openCourse(id, course.metadata.title, ok, course);
  };

  // The file's text goes through the same reader as a copied reply did
  // (lib/readReply), so the student sees the same preview before adding.
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPasted(await file.text());
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

  const copyButton = (
    <button type="button" onClick={copyPrompt} disabled={!kinds.length} className="press">
      <Icon name={copied ? 'check-circle' : 'clipboard'} size={14} />
      {copied ? 'Prompt copied' : 'Copy the prompt'}
    </button>
  );

  return (
    <Sheet
      label="Create a new lecture"
      title={classCode ? `New lecture for ${classCode}` : 'New lecture'}
      onClose={onClose}
      width="2xl"
    >
      <PromptBody
        left={
          <>
            <PromptStep n={1} title="What to make">
              <Rows>
                {!classCode && (
                  <Row label="Class">
                    <div role="radiogroup" aria-label="Which class is it for?" className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                      {classes.map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={!typing && klass === c}
                          onClick={() => {
                            setTyping(false);
                            setKlass(klass === c ? '' : c);
                          }}
                          className={`tap-safe text-sm ${
                            !typing && klass === c ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'text-text-2 hover:text-text'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                      {typing ? (
                        <input
                          autoFocus
                          value={klass}
                          onChange={(e) => setKlass(e.target.value)}
                          placeholder="Class code, e.g. PSYC 351"
                          aria-label="Another class"
                          className="field w-48 text-sm"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTyping(true);
                            setKlass('');
                          }}
                          className="tap-safe text-sm text-text-3 hover:text-text"
                        >
                          {classes.length ? 'Another' : 'Type its code'}
                        </button>
                      )}
                    </div>
                  </Row>
                )}
                <Row label="Make">
                  <MakeKindsField value={kinds} onChange={setKinds} />
                </Row>
                <Row label="Also">
                  <StudiesField checked={studies} onChange={setStudies} />
                  <MoreContextField checked={moreContext} onChange={setMoreContext} />
                </Row>
                <Row label="More">
                  <details>
                    <summary className="tap-safe cursor-pointer text-sm text-text-2 hover:text-text">
                      {Object.keys(lectures).length > 0 ? 'Your teacher\u2019s notes, or the lecture it follows' : 'Your teacher\u2019s notes'}
                    </summary>
                    <div className="mt-3 space-y-3 text-sm text-text-2">
                      <TeacherNotesField value={notes} onChange={setNotes} />
                      {Object.keys(lectures).length > 0 && (
                        <label className="block">
                          <span className="mark mb-1 block text-text-3">Follows on from</span>
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
                  </details>
                </Row>
              </Rows>
            </PromptStep>

            <PromptStep n={2} title="Copy the prompt">
              <p className="mb-3 text-sm text-text-2">
                Paste it into an AI chat, and attach your slides, notes or PDF to the same message. For the best results, use a more capable model on high effort.
              </p>
              {copyButton}
              <More label="Why attach them to the message?">
                <p>
                  Files kept only in a project often reach the AI as text, without their diagrams, and the lecture then
                  misses what the diagrams show. The prompt has the AI list every term and idea in your material first, so
                  the lecture covers all of it rather than skimming.
                </p>
              </More>
            </PromptStep>
          </>
        }
        right={
          <>
            <PromptStep n={3} title="Upload the file">
              <label className="press tap-safe inline-flex cursor-pointer">
                <Icon name="upload" size={13} />
                Upload the file the AI made
                <input type="file" accept=".json,.study.json" className="hidden" onChange={handleFile} />
              </label>
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
                {nearClass && (
                  <div role="radiogroup" aria-label="Which class" className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-text-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!keepOwn}
                      onClick={() => setKeepOwn(false)}
                      className={`tap-safe ${!keepOwn ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'hover:text-text'}`}
                    >
                      Put it with {nearClass}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={keepOwn}
                      onClick={() => setKeepOwn(true)}
                      className={`tap-safe ${keepOwn ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'hover:text-text'}`}
                    >
                      Keep {course.metadata.course_code}
                    </button>
                  </div>
                )}
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
          </>
        }
      />

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
    </Sheet>
  );
}

