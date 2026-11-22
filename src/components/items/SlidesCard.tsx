import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { FRAME, type ItemFrame } from './frame';
import { RichText } from './RichText';

interface SlidesCardProps {
  /** Where the section is in the student's source, unit included: "slides 12–18". */
  range?: string;
  /** What the section builds to (Section.builds_to). */
  buildsTo?: string;
  /** On the lecture's first section: what the whole lecture builds to. */
  lectureBuildsTo?: string;
  sectionTitle: string;
  keyboardEnabled?: boolean;
  /** Questions first: this section's reading cards go, each card asked before anything explains it. */
  onReadThem?: () => void;
  /** Read it here first: Learn as usual, reading cards first. */
  onTeachHere?: () => void;
  frame?: ItemFrame;
}

/**
 * The start of every section in Learn: where it is going, where it is in
 * the student's own notes when the file says, and one choice, asked at each
 * section's start (the owner, 2026-11-22): read it here first, or questions
 * first. Questions first suits a part just read in the student's own notes
 * or heard in the lecture: trying first helps even when the try fails
 * (Kornell et al. 2009, docs/evidence.md).
 */
export function SlidesCard({ range, buildsTo, lectureBuildsTo, sectionTitle, keyboardEnabled = false, onReadThem, onTeachHere, frame = 'sheet' }: SlidesCardProps) {
  // 1 reads first, 2 asks first; Enter takes the first, as Next would.
  useKeyboardShortcuts((e) => {
    if (e.key === '1' || e.key === 'Enter') {
      e.preventDefault();
      onTeachHere?.();
    } else if (e.key === '2') {
      e.preventDefault();
      onReadThem?.();
    }
  }, keyboardEnabled);
  const label = range ? range.charAt(0).toUpperCase() + range.slice(1) : '';

  return (
    <div className={FRAME[frame]}>
      {lectureBuildsTo && (
        <div className="mb-5 border-b border-border pb-4">
          <div className="mark mb-2 text-text-3">Where this lecture is going</div>
          <p className="prose-set text-body text-text">
            <RichText text={lectureBuildsTo} />
          </p>
        </div>
      )}
      <div className="mark mb-2 text-text-3">{buildsTo ? 'Where this part is going' : 'Next part'}</div>
      <h3 className="font-display text-heading font-semibold text-text">{sectionTitle}</h3>
      {buildsTo && (
        <p className="prose-set mt-2 text-body text-text">
          <RichText text={buildsTo} />
        </p>
      )}
      {range && (
        <p className="mt-4 text-small text-text-2">
          <span className="text-text-3">In your notes: </span>
          {label}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onTeachHere} className="press press-ink tap-safe">
          Read it here first
        </button>
        <button type="button" onClick={onReadThem} className="press tap-safe">
          Questions first
        </button>
      </div>
    </div>
  );
}
