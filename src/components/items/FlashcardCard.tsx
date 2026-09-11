import { useState } from 'react';
import type { FlashcardItem } from '@/schema/course';
import { Icon } from '@/components/Icon';
import { DifficultyBadge } from './DifficultyBadge';
import { SourceNote } from './SourceNote';

interface FlashcardCardProps {
  item: FlashcardItem;
  onGot?: () => void;
  onMissed?: () => void;
}

const FACE = 'flip-face flex min-h-[220px] w-full flex-col items-center justify-center gap-4 text-center';

export function FlashcardCard({ item, onGot, onMissed }: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3">
        Flashcard
        <DifficultyBadge difficulty={item.difficulty} />
      </div>

      <div className="flip-scene">
        <div className={`flip-card min-h-[220px] ${flipped ? 'is-flipped' : ''}`}>
          {/* Front */}
          <div className={FACE} aria-hidden={flipped}>
            <p className="text-lg text-text">{item.front}</p>
            <button
              type="button"
              tabIndex={flipped ? -1 : 0}
              onClick={() => setFlipped(true)}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Flip Card
            </button>
          </div>

          {/* Back */}
          <div className={`${FACE} flip-face--back`} aria-hidden={!flipped}>
            <p className="text-lg text-text">{item.back}</p>
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
                onClick={() => {
                  setFlipped(false);
                  onGot?.();
                }}
                className="rounded bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success-hover"
              >
                Got it ✓
              </button>
              <button
                type="button"
                tabIndex={flipped ? 0 : -1}
                onClick={() => {
                  setFlipped(false);
                  onMissed?.();
                }}
                className="rounded bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error-hover"
              >
                Missed it ✗
              </button>
            </div>
          </div>
        </div>
      </div>

      {flipped && <SourceNote excerpt={item.source_excerpt} />}
    </div>
  );
}
