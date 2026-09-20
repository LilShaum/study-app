/**
 * How an item is bounded.
 *
 * In a list — Browse, a section page — an item is one of many and needs an
 * edge: it is a card on the sheet. In a session there is one item on the
 * screen, and a bordered, filled, shadowed box around it has nothing to
 * separate it from. The page is the sheet; the item is printed on it.
 *
 * A flashcard is the one exception and keeps its card in both places,
 * because a flashcard is physically a card and the box is the metaphor, not
 * chrome around it.
 */
export type ItemFrame = 'card' | 'sheet';

export const FRAME: Record<ItemFrame, string> = {
  card: 'rounded-lg border border-border bg-surface p-5 shadow',
  sheet: 'py-1',
};
