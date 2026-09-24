// The canonical generator spec, imported straight from the repo's CLAUDE.md.
import GENERATOR_SPEC from '../../CLAUDE.md?raw';

/**
 * Sections of CLAUDE.md, for the prompts that need part of the spec rather
 * than all of it.
 *
 * The new-course and add-material prompts embed the whole file. The fix and
 * more-practice prompts used to carry their own paraphrase of the rules
 * instead — and a paraphrase drifts. When the option-length, source-citing
 * and recall-only rules were added to CLAUDE.md, those two prompts never
 * received them, so every batch of extra questions they produced could repeat
 * exactly the faults the app had just started reporting. Quoting the spec's
 * own sections means there is one copy of each rule.
 *
 * A heading is found by its exact text. Renaming one in CLAUDE.md would
 * otherwise empty a prompt silently, so generatorSpec.test.ts asserts that
 * every section used here exists and carries the rules it is relied on for.
 */
export function specSection(heading: string, source: string = GENERATOR_SPEC): string {
  const lines = source.split('\n');
  const level = heading.match(/^#+/)?.[0].length ?? 0;
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0 || level === 0) return '';

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+)\s/);
    // Ends at the next heading of the same or a higher level; a deeper one
    // belongs to this section.
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

/** How each item type is shaped — for prompts whose reader may not have the spec. */
export const ITEM_TYPES_SPEC = specSection('### Item types');

/** The rules for what makes an item good rather than merely valid. */
export const QUALITY_BAR_SPEC = specSection('## Quality bar');
