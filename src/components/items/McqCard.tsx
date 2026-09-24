import { useMemo, useState, type KeyboardEvent } from 'react';
import type { McqItem } from '@/schema/course';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { normalisedRationale } from '@/lib/mcqRationale';
import { DifficultyBadge } from './DifficultyBadge';
import { FRAME, type ItemFrame } from './frame';
import { SourceNote } from './SourceNote';

interface McqCardProps {
  item: McqItem;
  onAnswered?: (correct: boolean) => void;
  /** Shows an inline "Next →" link after the answer is revealed. */
  onNext?: () => void;
  /** Only true for the single card in a study session, never in Browse. */
  keyboardEnabled?: boolean;
  frame?: ItemFrame;
}

export function McqCard({ item, onAnswered, onNext, keyboardEnabled = false, frame = 'card' }: McqCardProps) {
  const [selected, setSelected] = useState(-1);
  const [revealed, setRevealed] = useState(false);
  const options = item.options ?? [];

  /**
   * A `correct_index` that points outside the options — the fault the health
   * panel calls "answer index pointing outside its options".
   *
   * Left unhandled this is worse than a missing question: no option can ever
   * equal correct_index, so the card marked every answer wrong, recorded a
   * miss against the student, and printed "the answer is" followed by
   * nothing. A broken key is the course's fault, so the card says so and
   * scores nothing.
   */
  const keyBroken =
    !Number.isInteger(item.correct_index) || item.correct_index < 0 || item.correct_index >= options.length;

  const rationales = useMemo(() => normalisedRationale(item), [item]);

  const selectOption = (i: number) => {
    if (!revealed) setSelected(i);
  };

  // Arrow/Home/End radiogroup navigation, matching the vanilla app's a11y pattern.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (revealed || options.length === 0) return;
    const cur = selected >= 0 ? selected : 0;
    let next: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (cur + 1) % options.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (cur - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next !== null) {
      e.preventDefault();
      setSelected(next);
    }
  };

  const check = () => {
    if (selected < 0 || revealed) return;
    setRevealed(true);
    if (!keyBroken) onAnswered?.(selected === item.correct_index);
  };

  // 1-9 picks an option, Enter checks, then Enter advances. Matches the
  // vanilla app's shortcuts.
  useKeyboardShortcuts((e) => {
    if (!revealed) {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault();
        setSelected(n - 1);
        return;
      }
      if (e.key === 'Enter' && selected >= 0) {
        e.preventDefault();
        check();
      }
      return;
    }
    if (e.key === 'Enter' && onNext) {
      e.preventDefault();
      onNext();
    }
  }, keyboardEnabled);

  const correct = selected === item.correct_index;

  return (
    <div className={FRAME[frame]}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3">
        Multiple Choice
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <div className="prose-set mb-4 text-heading text-text">{item.question}</div>

      <div
        role="radiogroup"
        aria-label="Answer options"
        className="space-y-2"
        onKeyDown={handleKeyDown}
      >
        {options.map((opt, i) => {
          const isSelected = i === selected;
          const isCorrectOpt = i === item.correct_index;
          let stateClasses = 'border-border hover:border-text-3';
          if (revealed && keyBroken) {
            // Nothing is known to be right, so colour nothing.
            if (isSelected) stateClasses = 'border-text';
          } else if (revealed) {
            if (isCorrectOpt) stateClasses = 'border-success text-success';
            else if (isSelected) stateClasses = 'border-error text-error';
          } else if (isSelected) {
            stateClasses = 'border-text';
          }
          const rationale = revealed ? rationales?.[i] || undefined : undefined;
          // Only when the key can be trusted. With a broken key nothing is
          // known to be right, so telling the student their pick is wrong
          // would be a claim the file cannot support.
          const chosenWrong = isSelected && !isCorrectOpt && !keyBroken;
          return (
            <div key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (selected < 0 && i === 0) ? 0 : -1}
                disabled={revealed}
                onClick={() => selectOption(i)}
                className={`flex w-full items-center gap-3 border-0 border-b px-1 py-3 text-left text-small text-text transition-colors disabled:cursor-default ${stateClasses}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                  {'ABCD'[i] ?? i + 1}
                </span>
                <span>{opt}</span>
              </button>
              {rationale && (
                /* The rationale under the option the student actually chose
                   is set to be read; the rest are there to be glanced at.
                   A wrong answer you picked is a misconception you just
                   acted on, and it is the one worth correcting — giving it
                   the same muted treatment as three options nobody touched
                   buries the only feedback that was earned. */
                <div
                  className={
                    chosenWrong
                      ? 'mt-1.5 border-l-2 border-error py-0.5 pl-3 text-small text-text-2'
                      : 'mt-1 pl-3 text-xs text-text-3'
                  }
                >
                  <span className={chosenWrong ? 'text-error' : 'text-text-2'}>
                    {chosenWrong ? 'Why that is wrong: ' : 'Why not: '}
                  </span>
                  {rationale}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!revealed ? (
        <button
          type="button"
          disabled={selected < 0}
          onClick={check}
          className="press press-ink tap-safe mt-4"
        >
          Check answer
        </button>
      ) : (
        <div className="mt-4">
          {keyBroken ? (
            <div className="font-medium text-warning">
              This question&rsquo;s answer key points outside its {options.length} option
              {options.length === 1 ? '' : 's'}, so none of them can be marked correct. Your answer
              wasn&rsquo;t scored — the fault is in the course file, not your answer.
            </div>
          ) : (
            <div className={`font-medium ${correct ? 'text-success' : 'text-error'}`}>
              {correct ? '✓ Correct!' : `✗ Incorrect — the answer is ${options[item.correct_index] ?? ''}`}
            </div>
          )}
          {item.explanation && <div className="mt-1 text-sm text-text-2">{item.explanation}</div>}
          {onNext && (
            <button type="button" onClick={onNext} className="press tap-safe mt-3">
              Next
            </button>
          )}
        </div>
      )}
      {revealed && <SourceNote excerpt={item.source_excerpt} />}
    </div>
  );
}
