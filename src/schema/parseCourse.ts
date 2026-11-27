import { ClassExamSchema, CourseSchema, InventorySchema, SCHEMA_VERSION, SourcePagesSchema, type Course } from './course';
import { formatZodError } from './formatZodError';
import { cutMessage, readReply } from '@/lib/readReply';

export type ParseCourseResult =
  | { ok: true; course: Course; warning?: string }
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
      error: 'Invalid .study.json: missing schema_version, metadata, or sections fields.',
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
      error: `This isn't a valid .study.json lecture:\n${formatZodError(result.error)}`,
    };
  }

  // Return the caller's own object (not Zod's parsed copy) so that export
  // round-trips are byte-for-byte lossless, including any unknown fields.
  // The one exception: the exam list (lib/classExams). It is someone else's
  // file, so only well-formed exams are kept, at most twenty, and a bad one
  // costs only itself, never the lecture or the other exams.
  let course = raw as Course;
  // So is the inventory: the generator's notes about the lecture, read
  // forgivingly (InventorySchema), so the cleaned lists are what is kept.
  if (course.metadata.inventory !== undefined) {
    const inventory = InventorySchema.safeParse(course.metadata.inventory);
    const metadata: Course['metadata'] = { ...course.metadata };
    if (inventory.success) metadata.inventory = inventory.data;
    else delete metadata.inventory;
    course = { ...course, metadata };
  }
  // The slide accounting (lib/sourceCoverage) is read the same way: kept
  // cleaned, or dropped whole, never the lecture.
  if (course.metadata.source_pages !== undefined) {
    const pages = SourcePagesSchema.safeParse(course.metadata.source_pages);
    const metadata: Course['metadata'] = { ...course.metadata };
    if (pages.success) metadata.source_pages = pages.data;
    else delete metadata.source_pages;
    course = { ...course, metadata };
  }
  // A card's slide: "slide 12" as written, a bare number as text, anything
  // else dropped. Only items that need it are copied.
  const odd = (v: unknown) => v !== undefined && (typeof v !== 'string' || v.length > 60);
  if (course.sections.some((s) => s.items.some((i) => odd(i.source_page)))) {
    course = {
      ...course,
      sections: course.sections.map((s) => ({
        ...s,
        items: s.items.map((i) => {
          if (!odd(i.source_page)) return i;
          const raw: unknown = i.source_page;
          const { source_page: _drop, ...rest } = i;
          void _drop;
          const kept = typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.slice(0, 60) : undefined;
          return (kept ? { ...rest, source_page: kept } : rest) as typeof i;
        }),
      })),
    };
  }
  // The AI's notes to the student: a list of strings, or dropped.
  if ('notes_for_student' in course.metadata) {
    const list: unknown = course.metadata.notes_for_student;
    const notes = Array.isArray(list) && list.every((n) => typeof n === 'string') ? (list as string[]).slice(0, 20) : [];
    const metadata: Course['metadata'] = { ...course.metadata, notes_for_student: notes };
    if (!notes.length) delete metadata.notes_for_student;
    course = { ...course, metadata };
  }
  if ('exams' in course.metadata) {
    const list: unknown = course.metadata.exams;
    const exams = (Array.isArray(list) ? list : []).flatMap((e) => {
      const r = ClassExamSchema.safeParse(e);
      return r.success ? [r.data] : [];
    }).slice(0, 20);
    const metadata: Course['metadata'] = { ...course.metadata, exams };
    if (!exams.length) delete metadata.exams;
    return { ok: true, course: { ...course, metadata } };
  }
  return { ok: true, course };
}

/** Parses a File (e.g. from an <input type="file"> upload) as a course. */
export async function parseCourseFile(file: File): Promise<ParseCourseResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: 'Could not read the file.' };
  }

  // A reply saved straight from a chat may be wrapped in text or cut off
  // partway; lib/readReply keeps what it can.
  const read = readReply(text);
  if (!read.ok) return { ok: false, error: 'Could not parse the file. Make sure it is a valid JSON file.' };
  const parsed = parseCourse(read.json);
  return parsed.ok && read.cut ? { ...parsed, warning: cutMessage(read.cut) } : parsed;
}
