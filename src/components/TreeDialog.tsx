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
  const aboutRef = useRef<HTMLDivElement>(null);
  const aboutButton = useRef<HTMLButtonElement>(null);
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
        // The backdrop closes; the sheet itself does not. A click anywhere
        // on the sheet outside the info card puts the card away.
        onClick={(e) => {
          e.stopPropagation();
          const t = e.target as Node;
          if (about && !aboutRef.current?.contains(t) && !aboutButton.current?.contains(t)) setAbout(false);
        }}
      >
        {/* Above the drawing: the info card hangs from this row over the tree,
            and the sheet stacks its children in document order. */}
        <div className="relative z-10 mb-2 flex w-full items-start justify-between gap-4">
          <span className="font-display text-heading font-semibold text-text">
            {course.metadata.title}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              ref={aboutButton}
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
          {/* A card from the info button, over the drawing, the way an info
              button is expected to behave. It first opened as a paragraph
              under the tree, which only made the dialog longer and was cut
              off at the bottom of a phone screen. */}
          {about && (
            <div
              id="tree-about"
              ref={aboutRef}
              className="paper-grain absolute right-0 top-full z-20 mt-2 w-72 max-w-full rounded-sm border border-border-strong bg-surface p-4 text-small text-text-2 shadow-md"
            >
              <p>Each branch is one section of the course.</p>
              <p className="mt-1.5">
                Its leaves grow as you study that section. As you forget it, they fall to the ground
                below.
              </p>
              <p className="mt-1.5">
                Choose a branch to see its name. Dotted outlines show where its fallen leaves were.
                Review the section and they grow back.
              </p>
              <p className="mt-1.5">
                {coarse
                  ? 'Drag your finger over the tree to choose a branch. Tap it again to open it.'
                  : 'Move over the tree to choose a branch. Click it to open it.'}
              </p>
            </div>
          )}
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
      </div>
    </div>
  );
}
