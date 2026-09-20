import type { Difficulty } from '@/schema/course';

const STYLES: Record<Difficulty, string> = {
  easy: 'text-easy',
  medium: 'text-medium',
  hard: 'text-hard',
};

/**
 * The word, in its colour, and nothing behind it.
 *
 * This was a filled pill — a tinted lozenge with the word inside — which is
 * the one shape a printed page never has. The eyebrow it sits in is already
 * set in small caps; the difficulty joins that line as another field, and
 * the colour is carried by the letters.
 */
export function DifficultyBadge({ difficulty }: { difficulty?: Difficulty }) {
  if (!difficulty) return null;
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wider ${STYLES[difficulty]}`}>
      {difficulty}
    </span>
  );
}
