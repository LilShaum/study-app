import type { Course, DefinitionItem } from '@/schema/course';
import { normaliseTerm } from './termMatch';
import { sortedSections } from './sortedSections';

export interface GlossaryEntry {
  item: DefinitionItem;
  sectionId: string;
  sectionTitle: string;
  /** The index letter it files under: A–Z, or # for a term that starts with a symbol or digit. */
  letter: string;
}

/** The letter a term files under. "[S]" and "5′ cap" have none, so they go under #, first, as in a printed index. */
export function letterOf(term: string): string {
  const raw = term.trim();
  if (/^[^\p{L}]/u.test(raw)) return '#';
  const first = normaliseTerm(raw)[0] ?? '';
  return /[a-z]/.test(first) ? first.toUpperCase() : '#';
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Every definition in the course, A–Z by term, the # entries first. */
export function glossaryOf(course: Course): GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  for (const section of sortedSections(course)) {
    for (const item of section.items) {
      if (item.type !== 'definition' || !item.term.trim()) continue;
      entries.push({ item, sectionId: section.id, sectionTitle: section.title, letter: letterOf(item.term) });
    }
  }
  return entries.sort(
    (a, b) =>
      Number(b.letter === '#') - Number(a.letter === '#') ||
      collator.compare(normaliseTerm(a.item.term), normaliseTerm(b.item.term)),
  );
}

/** Entries whose term, other names or meaning contain every word of the search. */
export function filterGlossary(entries: GlossaryEntry[], search: string): GlossaryEntry[] {
  const words = normaliseTerm(search).split(' ').filter(Boolean);
  if (!words.length) return entries;
  return entries.filter(({ item }) => {
    const text = normaliseTerm([item.term, ...(item.also_known_as ?? []), item.definition].join(' '));
    return words.every((w) => text.includes(w));
  });
}
