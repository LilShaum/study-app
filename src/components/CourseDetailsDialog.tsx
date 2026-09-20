import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Course } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { persisted } from '@/lib/safeStorage';
import { toast } from '@/store/toast';
import { Icon } from './Icon';

interface CourseDetailsDialogProps {
  courseId: string;
  course: Course;
  onClose: () => void;
}

const FIELD =
  'w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent';

/**
 * Editing a course's own details — title, code, subject, description, tags.
 *
 * The tag part is the reason this exists: the library has filtered by tag
 * since the rebuild, but tags only ever came from the generator, so a student
 * could filter by a vocabulary they had no way to add to. "Week 9",
 * "exam", "shaky" are the tags people actually want and none of them come
 * out of a lecture.
 *
 * The storage id is deliberately NOT recomputed from the new title. It is
 * derived from course_code||title at import, and progress, bookmarks and every
 * link point at it — rederiving it on a rename would silently orphan a
 * student's whole history for that course.
 */
export function CourseDetailsDialog({ courseId, course, onClose }: CourseDetailsDialogProps) {
  const updateCourse = useCoursesStore((s) => s.updateCourse);
  const allCourses = useCoursesStore((s) => s.courses);

  const [title, setTitle] = useState(course.metadata.title ?? '');
  const [code, setCode] = useState(course.metadata.course_code ?? '');
  const [subject, setSubject] = useState(course.metadata.subject ?? '');
  const [description, setDescription] = useState(course.metadata.description ?? '');
  const [tags, setTags] = useState<string[]>(course.metadata.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');

  // Tags already in use elsewhere in the library, so a student reuses
  // "week-9" rather than inventing "Week 9" and splitting the filter.
  const suggestions = useMemo(() => {
    const used = new Set(tags.map((t) => t.toLowerCase()));
    return [...new Set(Object.values(allCourses).flatMap((c) => c.metadata.tags ?? []))]
      .filter((t) => !used.has(t.toLowerCase()))
      .sort()
      .slice(0, 12);
  }, [allCourses, tags]);

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, '');
    if (!tag) return;
    setTagDraft('');
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    setTags((prev) => [...prev, tag]);
  };

  const tagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagDraft);
    } else if (e.key === 'Backspace' && !tagDraft && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    // A tag half-typed in the box is one the student meant to add.
    const finalTags = tagDraft.trim()
      ? [...tags.filter((t) => t.toLowerCase() !== tagDraft.trim().toLowerCase()), tagDraft.trim()]
      : tags;

    const metadata = { ...course.metadata, title: trimmedTitle };
    // Empty means "not set" rather than "set to an empty string", so optional
    // fields are dropped instead of being written as "".
    const optional = { course_code: code, subject, description };
    for (const [key, value] of Object.entries(optional)) {
      const v = value.trim();
      if (v) (metadata as Record<string, unknown>)[key] = v;
      else delete (metadata as Record<string, unknown>)[key];
    }
    if (finalTags.length) metadata.tags = finalTags;
    else delete (metadata as Record<string, unknown>).tags;

    const { ok } = persisted(() => updateCourse(courseId, { ...course, metadata }));
    toast(
      ok
        ? 'Course details saved.'
        : "Browser storage is full, so this wasn't saved. Export a course you've finished and remove it, then try again.",
      { type: ok ? 'success' : 'error', duration: ok ? undefined : 12000 },
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit course details"
    >
      <form onSubmit={save} className="my-8 w-full max-w-lg rounded-lg border border-border bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold text-text">Course details</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-3 hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={FIELD}
              placeholder="Enzyme Kinetics and Regulation"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Course code</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} className={FIELD} placeholder="BIOC 301" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={FIELD}
                placeholder="Biochemistry"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${FIELD} resize-y`}
              placeholder="What this course covers"
            />
          </label>

          <div>
            <span className="mb-1 block text-sm font-medium text-text">Tags</span>
            <p className="mb-2 text-xs text-text-3">Used to filter your library. Enter or comma adds one.</p>
            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded border border-border-strong px-2.5 py-1 text-xs text-text-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      aria-label={`Remove tag ${tag}`}
                      className="hover:text-text"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={tagKeyDown}
              className={FIELD}
              placeholder="week-9, exam, shaky…"
              aria-label="Add a tag"
            />
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-text-3">Used elsewhere:</span>
                {suggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="rounded border border-border px-2 py-0.5 text-text-2 hover:border-border-strong hover:text-text"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-text-3">
            Renaming a course keeps its progress: the id it is stored under was fixed when you added
            it and doesn&rsquo;t change here.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-4 py-2 text-sm text-text-2 hover:text-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
