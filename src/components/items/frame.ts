/**
 * How an item is bounded.
 *
 * In a list — Browse, a section page — an item is one of many and needs an
 * edge. In a session there is one item on the screen, and a box around it
 * has nothing to separate it from: the page is the sheet, the item is
 * printed on it.
 *
 * What changed is what "needs an edge" costs. This was written while the
 * app was itself a card floating on a backdrop, so a list item was a
 * smaller card on a larger one and a shadowed, filled, rounded box was
 * consistent with its surroundings. Now that the whole app is one sheet,
 * that box is the odd thing on the page — every other list in the app,
 * the library's contents, the ways to work, the sections, separates its
 * rows with a rule. So a listed item is a ruled entry too. An edge is all
 * it ever needed; the fill and the shadow were the part that came from
 * somewhere else.
 *
 * A flashcard is the one exception and keeps a card, because a flashcard
 * is physically a card and the box is the metaphor rather than chrome
 * around it. It carries its own styling and does not come through here.
 */
export type ItemFrame = 'card' | 'sheet';

export const FRAME: Record<ItemFrame, string> = {
  card: 'border-b border-border py-5',
  sheet: 'py-1',
};
