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
