import { CourseSchema, SCHEMA_VERSION, type Course } from './course';

export type ParseCourseResult =
  | { ok: true; course: Course }
  | { ok: false; error: string };

/**
 * Parses and validates a `.study.json` file's contents.
 *
 * Mirrors the vanilla app's upload guard exactly (same two checks, same
 * message copy) rather than surfacing raw Zod issue paths, since this is
 * user-facing text shown in a toast after a file upload.
 */
export function parseCourse(raw: unknown): ParseCourseResult {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('schema_version' in raw) ||
    !('metadata' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).sections)
  ) {
    return {
      ok: false,
      error: 'Invalid .study.json — missing schema_version, metadata, or sections fields.',
    };
  }

  const version = (raw as Record<string, unknown>).schema_version;
  if (version !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Schema version "${String(version)}" is not supported. Expected "${SCHEMA_VERSION}".`,
    };
  }

  const result = CourseSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: 'Could not parse the file. Make sure it is a valid .study.json course.' };
  }

  // Return the caller's own object (not Zod's parsed copy) so that export
  // round-trips are byte-for-byte lossless, including any unknown fields.
  return { ok: true, course: raw as Course };
}

/** Parses a File (e.g. from an <input type="file"> upload) as a course. */
export async function parseCourseFile(file: File): Promise<ParseCourseResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: 'Could not read the file.' };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Could not parse the file. Make sure it is a valid JSON file.' };
  }

  return parseCourse(json);
}
