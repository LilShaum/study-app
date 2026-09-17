import { useState, type KeyboardEvent } from 'react';
import type { McqItem } from '@/schema/course';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { DifficultyBadge } from './DifficultyBadge';
import { SourceNote } from './SourceNote';

/**
 * Resolves the "why is this wrong" note for one option.
 *
 * Tolerates both shapes seen in the wild: one entry per option (preferred —
 * unambiguous, the correct option's slot is ignored) and one entry per *wrong*
 * option in option order. Guessing wrong here would attach a rationale to the
 * wrong answer, which is worse than showing nothing, hence the explicit
 * length check rather than a best-effort index.
 */
function rationaleFor(item: McqItem, optionIndex: number): string | undefined {
  const list = item.distractor_rationale;
  const options = item.options ?? [];
  if (!list?.length || optionIndex === item.correct_index) return undefined;

  if (list.length === options.length) return list[optionIndex]?.trim() || undefined;

  if (list.length === options.length - 1) {
    const pos = optionIndex > item.correct_index ? optionIndex - 1 : optionIndex;
    return list[pos]?.trim() || undefined;
  }

  return undefined;
}

interface McqCardProps {
  item: McqItem;
  onAnswered?: (correct: boolean) => void;
  /** Shows an inline "Next →" link after the answer is revealed. */
  onNext?: () => void;
  /** Only true for the single card in a study session, never in Browse. */
  keyboardEnabled?: boolean;
}

export function McqCard({ item, onAnswered, onNext, keyboardEnabled = false }: McqCardProps) {
  const [selected, setSelected] = useState(-1);
  const [revealed, setRevealed] = useState(false);
  const options = item.options ?? [];

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
    onAnswered?.(selected === item.correct_index);
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
    <div className="rounded-lg border border-border bg-surface p-5 shadow">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3">
        Multiple Choice
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <div className="mb-4 text-lg text-text">{item.question}</div>

      <div
        role="radiogroup"
        aria-label="Answer options"
        className="space-y-2"
        onKeyDown={handleKeyDown}
      >
        {options.map((opt, i) => {
          const isSelected = i === selected;
          const isCorrectOpt = i === item.correct_index;
          let stateClasses = 'border-border hover:border-accent-border';
          if (revealed) {
            if (isCorrectOpt) stateClasses = 'border-success bg-success-bg text-success';
            else if (isSelected) stateClasses = 'border-error bg-error-bg text-error';
          } else if (isSelected) {
            stateClasses = 'border-accent bg-accent-light';
          }
          const rationale = revealed ? rationaleFor(item, i) : undefined;
          return (
            <div key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (selected < 0 && i === 0) ? 0 : -1}
                disabled={revealed}
                onClick={() => selectOption(i)}
                className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left text-sm text-text transition-colors disabled:cursor-default ${stateClasses}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                  {'ABCD'[i] ?? i + 1}
                </span>
                <span>{opt}</span>
              </button>
              {rationale && (
                <div className="mt-1 pl-3 text-xs text-text-3">
                  <span className="text-text-2">Why not: </span>
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
          className="mt-4 rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Check Answer
        </button>
      ) : (
        <div className="mt-4">
          <div className={`font-medium ${correct ? 'text-success' : 'text-error'}`}>
            {correct ? '✓ Correct!' : `✗ Incorrect — the answer is ${options[item.correct_index] ?? ''}`}
          </div>
          {item.explanation && <div className="mt-1 text-sm text-text-2">{item.explanation}</div>}
          {onNext && (
            <button type="button" onClick={onNext} className="mt-3 text-sm text-text-2 hover:text-text">
              Next →
            </button>
          )}
        </div>
      )}
      {revealed && <SourceNote excerpt={item.source_excerpt} />}
    </div>
  );
}
