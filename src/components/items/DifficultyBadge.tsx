import type { Difficulty } from '@/schema/course';

const STYLES: Record<Difficulty, string> = {
  easy: 'bg-easy-bg text-easy',
  medium: 'bg-medium-bg text-medium',
  hard: 'bg-hard-bg text-hard',
};

export function DifficultyBadge({ difficulty }: { difficulty?: Difficulty }) {
  if (!difficulty) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STYLES[difficulty]}`}>
      {difficulty}
    </span>
  );
}
