import { useMemo, useState, type KeyboardEvent } from 'react';
import type { McqItem } from '@/schema/course';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { normalisedRationale } from '@/lib/mcqRationale';
import { inOrder, orderForShowing } from '@/lib/optionOrder';
import { DifficultyBadge } from './DifficultyBadge';
import { FRAME, type ItemFrame } from './frame';
import { SourceNote } from './SourceNote';

interface McqCardProps {
  item: McqItem;
  /** `picked`: the chosen option's index in the lecture file, whatever order it was shown in. */
  onAnswered?: (correct: boolean, picked?: number) => void;
  /** Shows an inline "Next →" link after the answer is revealed. */
  onNext?: () => void;
  /** Only true for the single card in a study session, never in Browse. */
  keyboardEnabled?: boolean;
  frame?: ItemFrame;
  /** Learn: the passage opens after every answer, right or wrong (see SourceNote). */
  learning?: boolean;
}

export function McqCard({ item: written, onAnswered, onNext, keyboardEnabled = false, frame = 'card', learning = false }: McqCardProps) {
  // A new order at every showing, the key and notes following (lib/optionOrder).
  const [seed] = useState(() => Math.random().toString(36));
  const order = useMemo(() => orderForShowing(written.id, written.options ?? [], written.correct_index, seed), [written, seed]);
  const item = useMemo(() => inOrder(written, order), [written, order]);
  const [selected, setSelected] = useState(-1);
  const [revealed, setRevealed] = useState(false);
  /** Said "I don't know" rather than guess: shown the answer, counted as a miss. */
  const [dontKnow, setDontKnow] = useState(false);
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
    if (!keyBroken) onAnswered?.(selected === item.correct_index, order[selected] ?? selected);
  };

  // Rather than guess (the owner, 2026-10-26): the answer, every option's
  // reason and the explanation, as a miss. A guess that happens to be right
  // would have counted as known.
  const giveUp = () => {
    if (revealed) return;
    setSelected(-1);
    setDontKnow(true);
    setRevealed(true);
    if (!keyBroken) onAnswered?.(false);
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
  // Only when the key can be trusted. With a broken key nothing is known to
  // be right, so telling the student their pick is wrong would be a claim
  // the file cannot support.
  const chosenWrongOf = (i: number) => revealed && i === selected && i !== item.correct_index && !keyBroken;

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
          // One colour class each: a default text colour beside a state one
          // let the default win, and the right answer was never marked.
          let stateClasses = 'border-border text-text hover:border-text-3';
          if (revealed && keyBroken) {
            // Nothing is known to be right, so colour nothing.
            if (isSelected) stateClasses = 'border-text text-text';
          } else if (revealed) {
            if (isCorrectOpt) stateClasses = 'border-success text-success';
            else if (isSelected) stateClasses = 'border-error text-error';
            else stateClasses = 'border-border text-text-2';
          } else if (isSelected) {
            stateClasses = 'border-text text-text';
          }
          // Once revealed the mark says what the letter cannot: this one is
          // the answer, this one was yours and wrong.
          const mark = revealed && !keyBroken && isCorrectOpt ? '✓' : chosenWrongOf(i) ? '✗' : ('ABCD'[i] ?? String(i + 1));
          const rationale = revealed ? rationales?.[i] || undefined : undefined;
          const chosenWrong = chosenWrongOf(i);
          return (
            <div key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (selected < 0 && i === 0) ? 0 : -1}
                disabled={revealed}
                onClick={() => selectOption(i)}
                className={`flex w-full items-center gap-3 border-0 border-b px-1 py-3 text-left text-small transition-colors disabled:cursor-default ${stateClasses}`}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold"
                  aria-label={mark === '✓' ? `${'ABCD'[i] ?? i + 1}, the answer` : mark === '✗' ? `${'ABCD'[i] ?? i + 1}, your answer` : undefined}
                >
                  {mark}
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
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <button type="button" disabled={selected < 0} onClick={check} className="press press-ink tap-safe">
            Check answer
          </button>
          <button
            type="button"
            onClick={giveUp}
            className="tap-safe text-small text-text-3 underline-offset-4 hover:text-text hover:underline"
          >
            I don&rsquo;t know
          </button>
        </div>
      ) : (
        <div className="mt-4">
          {keyBroken ? (
            <div className="font-medium text-warning">
              This question&rsquo;s answer key points outside its {options.length} option
              {options.length === 1 ? '' : 's'}, so none of them can be marked correct. Your answer
              wasn&rsquo;t scored. The fault is in the lecture file, not your answer.
            </div>
          ) : (
            <div className={`font-medium ${dontKnow ? 'text-text' : correct ? 'text-success' : 'text-error'}`}>
              {/* The answer is marked in the list above; naming its letter is enough. */}
              {dontKnow
                ? `The answer is ${'ABCD'[item.correct_index] ?? item.correct_index + 1}.`
                : correct
                  ? '✓ Correct'
                  : `✗ Not this time: the answer is ${'ABCD'[item.correct_index] ?? item.correct_index + 1}.`}
            </div>
          )}
          {item.explanation && <div className="mt-1 text-sm text-text-2">{item.explanation}</div>}
          {onNext && (
            // Desktop only. On a phone the Prev/Next bar sits just below and
            // two Next buttons one above the other read as a mistake; on a
            // desktop this one stays, beside the explanation you just read.
            <button type="button" onClick={onNext} className="press tap-safe mt-3 hidden sm:inline-flex">
              Next
            </button>
          )}
        </div>
      )}
      {/* After a miss the passage is open: the lesson again, not only the right option. */}
      {revealed && <SourceNote excerpt={item.source_excerpt} open={(learning || !correct) && !keyBroken} />}
    </div>
  );
}
