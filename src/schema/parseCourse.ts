import { CourseSchema, SCHEMA_VERSION, type Course } from './course';
import { formatZodError } from './formatZodError';

export type ParseCourseResult =
  | { ok: true; course: Course }
  | { ok: false; error: string };

/**
 * Parses and validates a `.study.json` file's contents.
 *
 * Keeps the vanilla app's two up-front guards (so the common "wrong file
 * entirely" and "wrong version" cases read the same as they always have),
 * but surfaces Zod's issue paths for everything else — knowing it's
 * `sections[1].items[3].correct_index` is the difference between a fixable
 * error and a shrug.
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
    return {
      ok: false,
      error: `This isn't a valid .study.json course:\n${formatZodError(result.error)}`,
    };
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
