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
  /** Learn: the passage opens after every answer, right or wrong (see SourceNote). */
  learning?: boolean;
}

const FACE = 'flip-face flex min-h-[220px] w-full flex-col items-center justify-center gap-4 text-center';

export function FlashcardCard({ item, onGot, onMissed, keyboardEnabled = false, learning = false }: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [hintShown, setHintShown] = useState(false);

  const grade = (got: boolean) => {
    setFlipped(false);
    setHintShown(false);
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
            {/* A hint helps only before the answer is seen: offered here, on
                the front, for the student to ask for. It used to be printed
                on the back, under the answer it was meant to lead to. */}
            {item.hint &&
              (hintShown ? (
                <p className="flex items-center gap-1.5 text-sm text-text-2">
                  <Icon name="bulb" size={13} />
                  {item.hint}
                </p>
              ) : (
                <button
                  type="button"
                  tabIndex={flipped ? -1 : 0}
                  onClick={() => setHintShown(true)}
                  className="tap-safe text-sm text-text-3 underline-offset-4 hover:text-text hover:underline"
                >
                  Show a hint
                </button>
              ))}
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
            {/* The question stays in view above its answer, to check the one
                against the other before saying whether you got it. */}
            <p className="text-small text-text-3">{item.front}</p>
            <p className="font-display text-heading text-text">{item.back}</p>
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

      {flipped && <SourceNote excerpt={item.source_excerpt} open={learning} />}
    </div>
  );
}
