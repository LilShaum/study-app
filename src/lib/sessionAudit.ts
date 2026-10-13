import type { SessionItem } from "./buildSessionItems";
import { answeredBy, givesAway } from "./contentChecks";
import { askedOf, MIN_GAP } from "./learnSteps";

export { askedOf };

/**
 * A sitting read the way a student meets it, measured.
 *
 * Screenshots of single cards missed what the owner noticed in one real
 * session: the same fact asked twice in a row, answers given away by the
 * card itself, answers shown and then asked a moment later, and more reading
 * than asking (docs/proposals/content-quality.md). This counts those over a
 * whole sitting, so a change to the order can be judged by numbers and held
 * by tests (sessionAudit.test.ts).
 */

const READING = new Set([
  "definition",
  "preview",
  "example",
  "graphic",
  "slides",
]);

export interface SessionAudit {
  cards: number;
  reading: number;
  asked: number;
  /** Reading cards over all cards. */
  readingShare: number;
  /** "Name the term" cards whose definition spells the term out. */
  giveawaysAsked: string[];
  /** Cards that show a flashcard's answer before it is asked. */
  shownThenAsked: number;
  /**
   * A card asked fewer than MIN_GAP cards after one that answers it (the
   * same fact, or its answer printed), with their positions (1-based). One in
   * a section's last steps, a step's pause after its twin, is let off: there
   * is nowhere further in the section to send it.
   */
  sameFactInStep: { a: number; b: number; question: string }[];
}

export function auditSession(items: readonly SessionItem[]): SessionAudit {
  const reading = items.filter((i) => READING.has(i.type)).length;
  const giveawaysAsked = items
    .filter(
      (i): i is SessionItem & { type: "recall" } =>
        i.type === "recall" && !i.question,
    )
    .filter((i) => givesAway(i.target.term, i.target.definition))
    .map((i) => i.target.term);
  const sameFactInStep: SessionAudit["sameFactInStep"] = [];
  // The last step of each section with something to read; the steps after it
  // are the section's second look (lib/learnSteps, apart).
  const lastRead = new Map<string, number>();
  for (const i of items)
    if (READING.has(i.type) && i._step !== undefined)
      lastRead.set(
        i._sectionId,
        Math.max(lastRead.get(i._sectionId) ?? -1, i._step),
      );
  const asks = items
    .map((item, n) => ({ item, n, asked: askedOf(item) }))
    .filter((x) => x.asked && !x.item._again);
  for (let i = 0; i < asks.length; i++) {
    for (let j = i + 1; j < asks.length; j++) {
      const a = asks[i];
      const b = asks[j];
      if (a.item.id === b.item.id) continue;
      if (b.n - a.n - 1 >= MIN_GAP) continue;
      // A section's last steps have nowhere further to send a card: a step's
      // pause between the two is the most spacing it allows.
      const tail =
        b.item._step !== undefined &&
        (b.item._step === (b.item._steps ?? 0) - 1 ||
          b.item._step > (lastRead.get(b.item._sectionId) ?? -1));
      if (a.item._block !== b.item._block && tail) continue;
      if (answeredBy(a.asked!, b.asked!))
        sameFactInStep.push({
          a: a.n + 1,
          b: b.n + 1,
          question: b.asked!.question.slice(0, 70),
        });
    }
  }
  return {
    cards: items.length,
    reading,
    asked: items.length - reading,
    readingShare: items.length ? reading / items.length : 0,
    giveawaysAsked,
    shownThenAsked: items.filter((i) => i.type === "preview").length,
    sameFactInStep,
  };
}

/** The audit as a few lines, for the proposal file and the console. */
export function formatAudit(name: string, a: SessionAudit): string {
  return [
    `${name}: ${a.cards} cards, ${a.reading} to read (${Math.round(a.readingShare * 100)}%), ${a.asked} asked`,
    `  give-aways asked: ${a.giveawaysAsked.length}${a.giveawaysAsked.length ? ` (${a.giveawaysAsked.slice(0, 5).join(", ")})` : ""}`,
    `  answers shown before asked: ${a.shownThenAsked}`,
    `  too close to a card that answers it: ${a.sameFactInStep.length}${a.sameFactInStep.length ? ` (e.g. cards ${a.sameFactInStep[0].a} and ${a.sameFactInStep[0].b}: "${a.sameFactInStep[0].question}")` : ""}`,
  ].join("\n");
}

/**
 * A sitting as a student meets it, one line a card: step, type, what it asks
 * and wants, and a mark where the card is too close to one that answers it.
 * Read it start to finish before calling an order change done.
 */
export function formatWalk(items: readonly SessionItem[]): string {
  const close = new Set(auditSession(items).sameFactInStep.map((p) => p.b));
  let block: string | undefined;
  const lines: string[] = [];
  items.forEach((item, n) => {
    if (item._block !== block) {
      block = item._block;
      lines.push(
        `── ${item._sectionTitle} · ${block === "review" ? "review" : `step ${(item._step ?? 0) + 1} of ${item._steps ?? 1}`}`,
      );
    }
    const asked = askedOf(item);
    const what = asked
      ? `${asked.question.slice(0, 90)}  →  ${asked.answer.slice(0, 40)}`
      : item.type === "definition"
        ? `${item.term}: ${item.definition.slice(0, 80)}`
        : item.type === "example" || item.type === "graphic"
          ? item.title
          : "";
    lines.push(
      `${String(n + 1).padStart(4)} ${close.has(n + 1) ? "!" : " "} ${item.type.padEnd(10)} ${what}`,
    );
  });
  return lines.join("\n");
}
