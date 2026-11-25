/**
 * A class's code as the student would write it: letters, a space, then the
 * number ("BIOL365" and "biol-365" both read "BIOL 365"; the owner,
 * 2026-11-22). A code that is not letters then a number is only trimmed,
 * so nothing unusual is mangled.
 */
export function normalizeCourseCode(code: string): string;
export function normalizeCourseCode(code: string | undefined): string | undefined;
export function normalizeCourseCode(code: string | undefined): string | undefined {
  if (code == null) return code;
  const trimmed = code.trim();
  const m = /^([A-Za-z]{2,6})\s*[-_.]?\s*(\d{2,4}[A-Za-z]{0,2})$/.exec(trimmed);
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : trimmed;
}

/** The same lecture with its code written that way; the object itself when nothing changes. */
export function withNormalCode<T extends { metadata: { course_code?: string } }>(course: T): T {
  const code = course.metadata.course_code;
  const normal = normalizeCourseCode(code);
  return normal === code ? course : { ...course, metadata: { ...course.metadata, course_code: normal } };
}

/**
 * A class already in the library that a new lecture's code is probably
 * meant to be: the AI wrote "PSYC 351C" or "PYSC 351" for the student's
 * "PSYC 351" (docs/proposals/onboarding.md, option C). The same number with
 * subject letters a typo apart, or the same letters with a section letter
 * added or dropped. Null when the code is already one of the classes, or
 * nothing is close.
 */
export function closeClass(code: string | undefined, classes: readonly string[]): string | null {
  if (!code?.trim()) return null;
  const parts = (c: string) => {
    const m = /^([A-Z]+) (\d+)([A-Z]*)$/.exec(normalizeCourseCode(c));
    return m ? { letters: m[1], digits: m[2], suffix: m[3] } : null;
  };
  const mine = parts(code);
  if (!mine) return null;
  if (classes.some((c) => normalizeCourseCode(c) === normalizeCourseCode(code))) return null;
  for (const c of classes) {
    const theirs = parts(c);
    if (!theirs || theirs.digits !== mine.digits) continue;
    if (theirs.letters === mine.letters) return c; // only a section letter differs
    if (theirs.suffix === mine.suffix && editDistance(theirs.letters, mine.letters) <= 2) return c;
  }
  return null;
}

/** Letters changed, added, dropped or swapped with a neighbour, counted (Damerau). */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}
