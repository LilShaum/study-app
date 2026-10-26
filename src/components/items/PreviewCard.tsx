import type { PreviewItem } from '@/lib/buildSessionItems';
import { Icon } from '@/components/Icon';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { FRAME, type ItemFrame } from './frame';
import { SourceNote } from './SourceNote';
import { answerPoints } from '@/lib/answerPoints';

interface PreviewCardProps {
  item: PreviewItem;
  keyboardEnabled?: boolean;
  onNext?: () => void;
  frame?: ItemFrame;
}

/**
 * A flashcard shown open, to read before it is asked (Learn only). Set as
 * an entry on the page like a definition, not as a card: the card is the
 * thing that asks, and this one only teaches.
 */
export function PreviewCard({ item, keyboardEnabled = false, onNext, frame = 'sheet' }: PreviewCardProps) {
  useKeyboardShortcuts((e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    onNext?.();
  }, keyboardEnabled);
  const card = item.target;
  const points = answerPoints(card);

  // A written question's outline: what the section builds to, read before
  // its parts are taught and asked at its end (lib/learnSteps outlines).
  if (points && points.points.length >= 2) {
    return (
      <div className={FRAME[frame]}>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">This section builds to this answer</div>
        <p className="font-display text-heading text-text">{card.front}</p>
        {points.lead && <p className="mt-3 text-body text-text">{points.lead}</p>}
        <ol className="mt-3 border-y border-border">
          {points.points.map((point, k) => (
            <li key={k} className="flex gap-3 border-b border-border py-2.5 text-body text-text last:border-b-0">
              <span className="shrink-0 tabular-nums text-text-3">{k + 1}.</span>
              <span>{point}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-small text-text-2">
          Read the points now. The cards that follow teach them, and you write the whole answer from memory later.
        </p>
        <SourceNote excerpt={card.source_excerpt} />
      </div>
    );
  }

  return (
    <div className={FRAME[frame]}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">Read first, asked in a moment</div>
      <p className="font-display text-heading text-text">{card.front}</p>
      <p className="prose-set mt-3 border-l-2 border-border-strong pl-3 text-body text-text">{card.back}</p>
      {card.hint && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-text-3">
          <Icon name="bulb" size={13} />
          {card.hint}
        </p>
      )}
      <SourceNote excerpt={card.source_excerpt} open />
    </div>
  );
}
