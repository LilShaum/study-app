import { useEffect, useRef, useState } from 'react';
import { useDialog } from '@/lib/useDialog';
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
  useDialog(onClose);
  const [about, setAbout] = useState(false);
  // Whether the reader is using a finger, for the one line that says how to
  // pick a branch. Read once; it does not change while the dialog is open.
  const [coarse] = useState(() => window.matchMedia?.('(pointer: coarse)').matches ?? false);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${course.metadata.title}: the whole tree`}
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col items-center paper-grain rounded border border-border bg-bg p-6 shadow-md"
        // The backdrop closes; the sheet itself does not.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex w-full items-start justify-between gap-4">
          <span className="font-display text-heading font-semibold text-text">
            {course.metadata.title}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setAbout((open) => !open)}
              aria-label="How to read the tree"
              aria-expanded={about}
              aria-controls="tree-about"
              className={`tap-safe ${about ? 'text-text' : 'text-text-3'} hover:text-text`}
            >
              <Icon name="info" size={18} />
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap-safe text-text-3 hover:text-text"
            >
              <Icon name="x" size={18} />
            </button>
          </span>
        </div>

        <CourseTree
          courseId={courseId}
          course={course}
          progress={progress}
          // Shorter on a phone, so the caption under it fits.
          className="h-[50vh] sm:h-[62vh]"
          interactive
          mode="navigate"
        />
        {/* How to read the tree, for whoever asks. It used to sit under the
            drawing for everyone, every time, as a paragraph of explanation
            nobody had asked for. */}
        {about && (
          <div id="tree-about" className="mt-3 w-full max-w-md border-t border-border pt-3 text-small text-text-2">
            <p>Each branch is one section of the course.</p>
            <p className="mt-1.5">
              Leaves grow as you study a section. When you start to forget it they fall, and you can
              see them on the ground under the tree.
            </p>
            <p className="mt-1.5">
              Pick a branch to see its name. Dotted leaves show where it has lost leaves. Reviewing
              that section grows them back in the same places.
            </p>
            <p className="mt-1.5">
              {coarse
                ? 'Drag your finger across the tree to pick a branch, and tap it again to open it.'
                : 'Move over the tree to pick a branch, and click it to open it.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
