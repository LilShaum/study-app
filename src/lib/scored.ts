import type { StudyItem } from '@/schema/course';

/** The id a definition's typed-recall question is scored under. */
export const recallId = (definitionId: string) => `${definitionId}~recall`;

/**
 * Everything in a list of file items that a student can be scored on, under
 * the id its score is stored against.
 *
 * MCQs and flashcards are scored under their own ids. A definition is scored
 * too, but not as itself: its typed-recall question (see RecallItem) is
 * scored under recallId(definition.id), an id that exists in progress and
 * nowhere in the course file.
 *
 * That is why this has to be the one place the question is answered. Six
 * parts of the app used to decide "what counts" by looking for mcq and
 * flashcard in the file, and each would have been blind to recall: accuracy,
 * the library's figures, the progress page, and the Review Missed count —
 * which would then have shown fewer items than the session it opens.
 *
 * The file item comes back alongside the id, so callers can still read its
 * tags and section.
 */
export function scoredEntries(items: readonly StudyItem[]): { id: string; item: StudyItem }[] {
  const out: { id: string; item: StudyItem }[] = [];
  for (const item of items) {
    if (item.type === 'mcq' || item.type === 'flashcard') out.push({ id: item.id, item });
    else if (item.type === 'definition') out.push({ id: recallId(item.id), item });
  }
  return out;
}
