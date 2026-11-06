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
  /** "I've read it": Learn asks this section first and shows the answer after. */
  onReadThem?: () => void;
  /** "Teach me here instead": Learn as usual, reading cards first. */
  onTeachHere?: () => void;
  frame?: ItemFrame;
}

/**
 * The start of a section in Learn, when the course says where it is in the
 * student's own material (slides, pages, a chapter: the range carries its
 * unit). Worded for any source, not only slides (the owner, 2026-10-29). Reading their slides and then answering from memory
 * is the plan the owner studies by; trying before being told helps even
 * when the try fails (Kornell et al. 2009, docs/evidence.md), so a student
 * who has just read them is asked first, with the passage shown after.
 *
 * What the section builds to comes first, the way a teacher opens a new part
 * of a lecture and the slides never say (docs/proposals/narration.md). With no
 * range it is the whole card, read and left with Next like any reading card.
 */
export function SlidesCard({ range, buildsTo, lectureBuildsTo, sectionTitle, keyboardEnabled = false, onReadThem, onTeachHere, frame = 'sheet' }: SlidesCardProps) {
  useKeyboardShortcuts((e) => {
    if (e.key !== 'Enter' || !range) return;
    e.preventDefault();
    onReadThem?.();
  }, keyboardEnabled);
  const label = range ? range.charAt(0).toUpperCase() + range.slice(1) : '';

  return (
    <div className={FRAME[frame]}>
      {lectureBuildsTo && (
        <div className={buildsTo || range ? 'mb-5 border-b border-border pb-4' : ''}>
          <div className="mark mb-2 text-text-3">Where this lecture is going</div>
          <p className="prose-set text-body text-text">
            <RichText text={lectureBuildsTo} />
          </p>
        </div>
      )}
      {buildsTo && (
        <>
          <div className="mark mb-2 text-text-3">Where this part is going</div>
          <h3 className="font-display text-heading font-semibold text-text">{sectionTitle}</h3>
          <p className="prose-set mt-2 text-body text-text">
            <RichText text={buildsTo} />
          </p>
        </>
      )}
      {range && (
        <div className={buildsTo ? 'mt-5 border-t border-border pt-4' : ''}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">From your own notes</div>
          <p className="font-display text-heading text-text">{label}</p>
          {!buildsTo && <p className="mt-1 text-small text-text-2">{sectionTitle}</p>}
          <p className="prose-set mt-4 text-body text-text">
            Read this part of your own material first, whatever you made the lecture from. Then put it away and answer
            from memory: the questions come before the answers, and trying first helps even when you get it wrong.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={onReadThem} className="press press-ink tap-safe">
              I&rsquo;ve read it
            </button>
            <button type="button" onClick={onTeachHere} className="press tap-safe">
              Teach me here instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
