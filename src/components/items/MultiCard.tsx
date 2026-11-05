import { useMemo, useState, type ReactNode } from 'react';
import type { MultiItem } from '@/schema/course';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { multiInOrder, orderForShowing } from '@/lib/optionOrder';
import { multiKey, multiReasons, multiRight, statementsRight } from '@/lib/multiKey';
import { DifficultyBadge } from './DifficultyBadge';
import { FRAME, type ItemFrame } from './frame';
import { SourceNote } from './SourceNote';
import { IdeaNote } from './IdeaNote';
import { RichText } from './RichText';

interface MultiCardProps {
  item: MultiItem;
  /** `sure`: false when Not sure was tapped before checking; absent for I don't know. No pick is passed: there are several. */
  onAnswered?: (correct: boolean, picked?: number, sure?: boolean) => void;
  /** Shows an inline "Next" after the answer is revealed. */
  onNext?: () => void;
  /** Only true for the single card in a study session, never in Browse. */
  keyboardEnabled?: boolean;
  frame?: ItemFrame;
  /** Learn: the passage opens after every answer, right or wrong (see SourceNote). */
  learning?: boolean;
  /** The explanation the question rests on: open after a miss, folded after a right answer (IdeaNote). */
  idea?: { title: string; text: string } | null;
}

/**
 * Select all that apply (docs/proposals/multi-select.md): several statements
 * about one idea, each true or false of it, so each is a judgement of its
 * own and none can be found by striking out the rest (Couch, Wood & Knight
 * 2015). How many are true is never said: that turns it back into
 * elimination. Marked all or nothing, every statement shown with its verdict
 * and its reason, and how many of them were judged right, so a near miss
 * reads as one.
 */
export function MultiCard({ item: written, onAnswered, onNext, keyboardEnabled = false, frame = 'card', learning = false, idea }: MultiCardProps) {
  // A new order at every showing, the key and reasons following (lib/optionOrder).
  const [seed] = useState(() => Math.random().toString(36));
  const order = useMemo(
    () => orderForShowing(written.id, written.options ?? [], [...(multiKey(written) ?? [])], seed),
    [written, seed],
  );
  const item = useMemo(() => multiInOrder(written, order), [written, order]);
  const options = item.options ?? [];
  const key = useMemo(() => multiKey(item), [item]);
  const reasons = useMemo(() => multiReasons(item), [item]);
  /** Ticked statements, by where they are shown. */
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());
  const [revealed, setRevealed] = useState(false);
  /** Said "I don't know" rather than guess: shown the answer, counted as a miss. */
  const [dontKnow, setDontKnow] = useState(false);
  /** Not sure, tapped before checking: a right answer given unsure gets its feedback open, as a miss does (McqCard). */
  const [unsure, setUnsure] = useState(false);

  /**
   * A key that marks nothing true, or names a statement that is not there
   * (lib/multiKey): the lecture file's fault, so nothing is scored and the
   * card says so, as McqCard does for an answer index outside its options.
   */
  const keyBroken = !key;
  const got = !!key && !dontKnow && multiRight(key, picked);

  const toggle = (i: number) => {
    if (revealed) return;
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const check = () => {
    if (!picked.size || revealed) return;
    setRevealed(true);
    if (key) onAnswered?.(multiRight(key, picked), undefined, !unsure);
  };

  // Rather than guess (the owner, 2026-10-26): the true statements, every
  // reason and the explanation, as a miss.
  const giveUp = () => {
    if (revealed) return;
    setPicked(new Set());
    setDontKnow(true);
    setRevealed(true);
    if (key) onAnswered?.(false);
  };

  // 1-9 ticks or unticks a statement, Enter checks, then Enter advances, as McqCard.
  useKeyboardShortcuts((e) => {
    if (!revealed) {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault();
        toggle(n - 1);
        return;
      }
      if (e.key === 'Enter' && picked.size) {
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

  const right = key ? statementsRight(key, picked, options.length) : 0;
  const n = options.length;

  return (
    <div className={FRAME[frame]}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3">
        Select all that apply
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <div className="prose-set mb-4 text-heading text-text"><RichText text={item.question} /></div>

      <MultiStatements
        options={options}
        trueOnes={key}
        picked={picked}
        marked={revealed}
        reasons={reasons}
        dontKnow={dontKnow}
        onToggle={revealed ? undefined : toggle}
      />

      {!revealed ? (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <button type="button" disabled={!picked.size} onClick={check} className="press press-ink tap-safe">
            Check answer
          </button>
          <button
            type="button"
            aria-pressed={unsure}
            onClick={() => setUnsure((u) => !u)}
            className={`tap-safe text-small underline-offset-4 hover:underline ${unsure ? 'text-accent underline decoration-accent decoration-2' : 'text-text-3 hover:text-text'}`}
          >
            Not sure
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
              This question&rsquo;s key marks no statement true, or names one that isn&rsquo;t there, so it
              can&rsquo;t be marked. Your answer wasn&rsquo;t scored. The fault is in the lecture file, not your answer.
            </div>
          ) : (
            <div className={`font-medium ${dontKnow ? 'text-text' : got ? 'text-success' : 'text-error'}`}>
              {dontKnow
                ? 'The true statements are marked ✓.'
                : got
                  ? `✓ Correct: all ${n} statements right.`
                  : `✗ Not this time: ${right} of ${n} statements right.`}
            </div>
          )}
          {item.explanation && <div className="mt-1 text-sm text-text-2"><RichText text={item.explanation} /></div>}
          {onNext && (
            // Desktop only, as McqCard: on a phone the Prev/Next bar sits just below.
            <button type="button" onClick={onNext} className="press tap-safe mt-3 hidden sm:inline-flex">
              Next
            </button>
          )}
        </div>
      )}
      {/* After a miss the why is open, then the passage: the lesson again, not only the true statements. */}
      {revealed && !keyBroken && <IdeaNote idea={idea} open={!got || unsure} />}
      {revealed && <SourceNote excerpt={item.source_excerpt} open={(learning || !got || unsure) && !keyBroken} />}
    </div>
  );
}

/**
 * The statements of a select-all question as ticks, then, once marked, each
 * with its verdict and its reason: the card's list, and the practice test's
 * (taking it, and what was missed). Indices are positions in `options`, in
 * the order shown.
 */
export function MultiStatements({
  options,
  trueOnes,
  picked,
  marked,
  reasons,
  dontKnow = false,
  onToggle,
}: {
  options: readonly string[];
  /** The true statements; null when the key cannot be trusted, and then nothing is coloured. */
  trueOnes: ReadonlySet<number> | null;
  picked: ReadonlySet<number>;
  /** Each statement's verdict and reason shown. */
  marked: boolean;
  /** One per statement (lib/multiKey multiReasons). */
  reasons?: readonly string[];
  /** Nothing was ticked on purpose: the true ones are shown, not called missed. */
  dontKnow?: boolean;
  /** Absent once the list is fixed: marked, or a review. */
  onToggle?: (i: number) => void;
}) {
  return (
    <div role="group" aria-label="Statements" data-statements="" className="space-y-2">
      {options.map((text, i) => {
        const ticked = picked.has(i);
        const isTrue = !!trueOnes?.has(i);
        // One colour class each, as McqCard: a default beside a state one let the default win.
        let tone = 'border-border text-text hover:border-text-3';
        let box = '';
        let mark: string = ticked ? '✓' : '';
        let label: string | undefined;
        let note: ReactNode = null;
        const reason = marked && trueOnes ? reasons?.[i] || '' : '';
        /** A reason set to be read: the statements judged wrong. The rest are there to be glanced at. */
        const loud = (border: string, colour: string, lead: string) => (
          <div className={`mt-1.5 border-l-2 ${border} py-0.5 pl-3 text-small text-text-2`}>
            <span className={colour}>{reason ? `${lead}: ` : lead}</span>
            {reason && <RichText text={reason} />}
          </div>
        );
        const quiet = (lead: string) =>
          reason ? (
            <div className="mt-1 pl-3 text-xs text-text-3">
              <span className="text-text-2">{lead}: </span>
              <RichText text={reason} />
            </div>
          ) : null;
        if (marked && !trueOnes) {
          // Nothing is known to be true, so nothing is coloured.
          tone = ticked ? 'border-text text-text' : 'border-border text-text-2';
        } else if (marked) {
          if (isTrue && (ticked || dontKnow)) {
            tone = 'border-success text-success';
            mark = '✓';
            label = ticked ? 'true, you ticked it' : 'true';
            note = quiet('True');
          } else if (isTrue) {
            // True but left: a statement judged wrong, set to be read, plainly.
            // The box stays empty, as it was left: a tick there read as one
            // the student made. The dashed edge says it should have been.
            tone = 'border-success text-text';
            box = 'border-dashed border-success';
            mark = '';
            label = 'true, you left it';
            note = loud('border-success', 'text-success', 'Also true');
          } else if (ticked) {
            tone = 'border-error text-error';
            mark = '✗';
            label = 'false, you ticked it';
            note = reason ? loud('border-error', 'text-error', 'Why that is wrong') : null;
          } else {
            tone = 'border-border text-text-2';
            mark = '';
            label = 'false';
            note = quiet('Why not');
          }
        } else if (ticked) {
          tone = 'border-text text-text';
        }
        return (
          <div key={i}>
            <button
              type="button"
              role="checkbox"
              aria-checked={ticked}
              disabled={!onToggle}
              onClick={() => onToggle?.(i)}
              className={`flex w-full items-center gap-3 border-0 border-b px-1 py-3 text-left text-small transition-colors disabled:cursor-default ${tone}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center border text-xs font-semibold ${box || 'border-current'}`}
                aria-label={label}
                aria-hidden={label ? undefined : true}
              >
                {mark}
              </span>
              <span><RichText text={text} /></span>
            </button>
            {note}
          </div>
        );
      })}
    </div>
  );
}
