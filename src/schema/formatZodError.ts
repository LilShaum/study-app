import type { ZodError } from 'zod';

/**
 * Turns a ZodError into a few lines a student can act on — and, more to the
 * point, paste back into the chat that produced the bad JSON.
 *
 * `parseCourse` used to discard `result.error` entirely and show one generic
 * "could not parse" string, which told you nothing about which of 60 items was
 * malformed. Zod already knows it's `sections[1].items[3].correct_index`, so
 * say that.
 *
 * Capped at `max` issues because a single wrong item type can cascade into
 * dozens of union errors, and a wall of them is as useless as none.
 */
export function formatZodError(error: ZodError, max = 5): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const issue of error.issues) {
    const path = issue.path.length ? formatPath(issue.path) : 'the file';
    const line = `${path}: ${issue.message}`;
    if (seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
    if (lines.length === max) break;
  }

  const remaining = error.issues.length - lines.length;
  if (remaining > 0) lines.push(`…and ${remaining} more problem${remaining === 1 ? '' : 's'}.`);

  return lines.join('\n');
}

/** `['sections', 1, 'items', 3, 'correct_index']` → `sections[1].items[3].correct_index` */
function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((part, i) => (typeof part === 'number' ? `[${part}]` : i === 0 ? String(part) : `.${String(part)}`))
    .join('');
}
