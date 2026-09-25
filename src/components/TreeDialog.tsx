import { useEffect, useRef } from 'react';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { CourseTree } from './CourseTree';
import { Icon } from './Icon';

interface TreeDialogProps {
  courseId: string;
  course: Course;
  progress: Record<string, ItemResult>;
  onClose: () => void;
}

/**
 * The tree, at the size it needs to be used at.
 *
 * On a course page the drawing is a thumbnail: identity, and a reading of
 * where the course stands. It is not a control — aiming at one limb among
 * eleven interleaved crowns at that size picks the right section about 60%
 * of the time, measured. Opened out it is three times the height, so the
 * pointer resolves about four times finer in the drawing's own units, the
 * name of whatever it is nearest is legible under it, and the limbs around
 * it move aside. Then it is a control.
 */
export function TreeDialog({ courseId, course, progress, onClose }: TreeDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // The page behind must not scroll while this is over it.
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = scroll;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${course.metadata.title}: the whole tree`}
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col items-center rounded border border-border bg-bg p-6 shadow-md"
        // The backdrop closes; the sheet itself does not.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex w-full items-start justify-between gap-4">
          <span className="font-display text-heading font-semibold text-text">
            {course.metadata.title}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-safe shrink-0 text-text-3 hover:text-text"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <CourseTree
          courseId={courseId}
          course={course}
          progress={progress}
          className="h-[68vh]"
          interactive
          mode="navigate"
        />
        {/* The one place the picture is explained. Short, because the tree
            has to read without it — this is for the first time you look. */}
        <p className="mt-3 max-w-prose text-center text-small text-text-3">
          Each branch is a section. Its leaves are what you still remember: they fall as it fades
          and grow back when you review. What lies on the ground is what has faded. Tap a branch
          to open its section.
        </p>
      </div>
    </div>
  );
}
