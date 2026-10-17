import type { Course, StudyItem as Item } from '@/schema/course';
import { sortedSections } from './sortedSections';

/**
 * The cards about empirical studies, grouped by study.
 *
 * Some classes test the studies themselves: the question, the method, the
 * results and what they support (the owner's cognitive neuroscience class
 * asks for exactly that in its short answers). Practice and the practice
 * test can be narrowed to them, across a lecture or a whole class.
 *
 * A card belongs to a study when the generator tagged it `study:<name>`
 * (prompts/generator.md asks for this), or, in a lecture made before that,
 * when the card cites one: "Jonides (1981)", "Corbetta et al. (2000)",
 * "Goodale & Milner, 1992". A card that cites several belongs to the first
 * its question names. The excerpt from the slides is not read: a slide's
 * image credit would pull every card on that slide into a "study".
 */

export interface Study {
  /** Stable within a lecture: the first author and year, lower case ("jonides 1981"), or the tag's text. */
  key: string;
  /** How the cards name it: "Jonides (1981)", "Corbetta et al. (2000)". */
  label: string;
  /** In lecture order. */
  itemIds: string[];
}

const TAG = /^study:\s*(.+)$/i;

// A surname (capitalised, at least two lower-case letters after it, so "EEG"
// and "Hz" are not authors), an optional co-author or "et al.", then a year
// in brackets, or after a comma when there is a co-author or "et al." (a
// lone "Britain, 1940" is a place and a date, not a citation).
const CITATION =
  /\b([A-Z][a-zà-ÿ'’-]{2,}(?:-[A-Z][a-zà-ÿ'’-]+)?)(?:['’]s)?((?:\s*(?:&|and)\s*[A-Z][a-zà-ÿ'’-]{2,})?(?:\s+et\s+al\.?)?)\s*(\(|,\s*)((?:19|20)\d\d)[a-z]?\b/g;

// A case study named by two initials: "patient DF", "Patient H.M." (three
// would take "patient MRI").
const PATIENT = /\b[Pp]atient\s+((?:[A-Z]\.?){2})(?![A-Za-z])/g;

// Capitalised words that come before a year without being authors.
const NOT_AUTHORS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'From', 'Figure', 'Table', 'Study', 'Studies', 'Since', 'Until', 'Before',
  'After', 'During', 'Around', 'About', 'Year', 'Slide', 'Slides', 'Page', 'Part', 'Lecture', 'Chapter', 'January',
  'February', 'March', 'April', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Spring',
  'Summer', 'Autumn', 'Fall', 'Winter',
]);

/** The text a card asks, then the rest of what it says, as separate strings. */
function texts(item: Item): [string, string] {
  const i = item as unknown as Record<string, unknown>;
  const s = (k: string) => (typeof i[k] === 'string' ? (i[k] as string) : '');
  const asked = [s('question'), s('front'), s('term'), s('title')].join('\n');
  const steps = Array.isArray(i.steps) ? (i.steps as unknown[]).filter((x) => typeof x === 'string').join('\n') : '';
  const said = [s('back'), s('definition'), s('explanation'), s('context'), s('takeaway'), s('caption'), steps].join('\n');
  return [asked, said];
}

/** The studies a piece of text cites, in the order it cites them. */
export function citationsIn(text: string): { key: string; label: string }[] {
  const out: { key: string; label: string; at: number }[] = [];
  for (const m of text.matchAll(PATIENT)) {
    const initials = m[1].replace(/\./g, '');
    out.push({ key: `patient ${initials.toLowerCase()}`, label: `Patient ${initials}`, at: m.index });
  }
  for (const m of text.matchAll(CITATION)) {
    const [, raw, rest, opener, year] = m;
    const name = raw.replace(/['’]s$/, '');
    if (NOT_AUTHORS.has(name)) continue;
    const co = rest.replace(/\s+/g, ' ').trim();
    if (opener !== '(' && !co) continue;
    const label = `${name}${co ? ` ${co.replace(/^and\b/, '&').replace(/\bet al$/, 'et al.')}` : ''} (${year})`;
    out.push({ key: `${name.toLowerCase()} ${year}`, label, at: m.index });
  }
  return out.sort((a, b) => a.at - b.at).map(({ key, label }) => ({ key, label }));
}

/** The study a card is about, or null. */
export function studyOf(item: Item): { key: string; label: string } | null {
  for (const tag of item.tags ?? []) {
    const m = TAG.exec(tag.trim());
    if (!m) continue;
    const label = m[1].trim();
    const cited = citationsIn(label)[0];
    // "study:Jonides et al. (1981)" and an untagged card citing Jonides (1981) are one study.
    return cited ? { key: cited.key, label } : { key: label.toLowerCase(), label };
  }
  const [asked, said] = texts(item);
  return citationsIn(asked)[0] ?? citationsIn(said)[0] ?? null;
}

/** Every study in a lecture with its cards, in the order the lecture first meets each. Set-aside cards are left out. */
export function studiesIn(course: Course): Study[] {
  const byKey = new Map<string, Study & { labels: Map<string, number> }>();
  for (const section of sortedSections(course)) {
    for (const item of section.items) {
      if (item.set_aside) continue;
      const s = studyOf(item);
      if (!s) continue;
      const study = byKey.get(s.key) ?? { key: s.key, label: s.label, itemIds: [] as string[], labels: new Map<string, number>() };
      study.itemIds.push(item.id);
      study.labels.set(s.label, (study.labels.get(s.label) ?? 0) + 1);
      byKey.set(s.key, study);
    }
  }
  // Named the way most of its cards name it; the fullest form on a tie.
  return [...byKey.values()].map(({ key, itemIds, labels }) => ({
    key,
    itemIds,
    label: [...labels].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0],
  }));
}

/**
 * The card ids a study choice keeps: `all` for every study card, else one
 * study's key. Null when the lecture has none, so a caller can tell "no
 * filter" from "nothing to show".
 */
export function studyItemIds(course: Course, choice: string): Set<string> | null {
  const studies = studiesIn(course);
  const picked = choice === 'all' ? studies : studies.filter((s) => s.key === choice);
  if (!picked.length) return null;
  return new Set(picked.flatMap((s) => s.itemIds));
}

/**
 * The cards a studies choice keeps, as every session, count and test uses
 * it: undefined for no choice (every card), and an empty set, not "no
 * filter", when the lecture has no such study.
 */
export function onlyStudies(course: Course, study: string | null | undefined): ReadonlySet<string> | undefined {
  if (!study) return undefined;
  return studyItemIds(course, study) ?? new Set();
}
