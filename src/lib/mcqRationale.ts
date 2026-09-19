import type { McqItem } from '@/schema/course';

/**
 * The per-option "why is this wrong" notes, normalised to one entry per
 * option, in option order, with an empty string in the correct answer's slot.
 *
 * Two shapes turn up in real course files: the contract's index-aligned array
 * (one entry per option) and a shorter array holding one entry per *wrong*
 * option. Guessing between them wrongly attaches a rationale to the wrong
 * answer, which is worse than showing none — so anything that is neither
 * length returns undefined rather than a best effort.
 *
 * Normalising in one place means the card that displays these and the form
 * that edits them cannot disagree about which note belongs to which option.
 */
export function normalisedRationale(item: McqItem): string[] | undefined {
  const list = item.distractor_rationale;
  const options = item.options ?? [];
  if (!list?.length) return undefined;

  const aligned = list.length === options.length;
  const perWrong = list.length === options.length - 1;
  if (!aligned && !perWrong) return undefined;

  return options.map((_, i) => {
    if (i === item.correct_index) return '';
    if (aligned) return list[i]?.trim() ?? '';
    const pos = i > item.correct_index ? i - 1 : i;
    return list[pos]?.trim() ?? '';
  });
}
