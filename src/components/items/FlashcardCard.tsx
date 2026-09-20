import { useState } from 'react';
import type { FlashcardItem } from '@/schema/course';
import { Icon } from '@/components/Icon';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { DifficultyBadge } from './DifficultyBadge';
import { SourceNote } from './SourceNote';

interface FlashcardCardProps {
  item: FlashcardItem;
  onGot?: () => void;
  onMissed?: () => void;
  /** Only true for the single card in a study session, never in Browse. */
  keyboardEnabled?: boolean;
}

const FACE = 'flip-face flex min-h-[220px] w-full flex-col items-center justify-center gap-4 text-center';

export function FlashcardCard({ item, onGot, onMissed, keyboardEnabled = false }: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false);

  const grade = (got: boolean) => {
    setFlipped(false);
    if (got) onGot?.();
    else onMissed?.();
  };

  // Space flips; G/M grade once the answer is showing (grading blind would
  // record a result the user never actually checked).
  useKeyboardShortcuts((e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      setFlipped((f) => !f);
      return;
    }
    if (!flipped) return;
    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      grade(true);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      grade(false);
    }
  }, keyboardEnabled);

  return (
    <div className="rounded-sm border border-border-light border-t-text-3 border-t-2 bg-surface p-5 shadow sm:p-6">
      <div className="mark mb-4 flex items-center gap-2 border-b border-border-light pb-2 text-text-3">
        Flashcard
        <DifficultyBadge difficulty={item.difficulty} />
      </div>

      <div className="flip-scene">
        <div className={`flip-card min-h-[220px] ${flipped ? 'is-flipped' : ''}`}>
          {/* Front */}
          <div className={FACE} aria-hidden={flipped}>
            <p className="font-display text-heading text-text">{item.front}</p>
            <button
              type="button"
              tabIndex={flipped ? -1 : 0}
              onClick={() => setFlipped(true)}
              className="press press-ink tap-safe"
            >
              Flip card
            </button>
          </div>

          {/* Back */}
          <div className={`${FACE} flip-face--back`} aria-hidden={!flipped}>
            <p className="font-display text-heading text-text">{item.back}</p>
            {item.hint && (
              <p className="flex items-center gap-1.5 text-sm text-text-3">
                <Icon name="bulb" size={13} />
                {item.hint}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                tabIndex={flipped ? 0 : -1}
                onClick={() => grade(true)}
                className="press press-yes tap-safe"
              >
                Got it
              </button>
              <button
                type="button"
                tabIndex={flipped ? 0 : -1}
                onClick={() => grade(false)}
                className="press press-no tap-safe"
              >
                Missed it
              </button>
            </div>
          </div>
        </div>
      </div>

      {flipped && <SourceNote excerpt={item.source_excerpt} />}
    </div>
  );
}
