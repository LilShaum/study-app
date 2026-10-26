// From prompts/generator.md, so the prompt the app hands out is the spec the
// app parses, with its studies passages chosen (lib/generatorSpec).
import { generatorSpec } from './generatorSpec';
import { teacherNotesBlock } from './teacherNotes';
import { previousLectureBlock } from './previousLecture';
import type { Course } from '@/schema/course';

/**
 * The prompt for generating a course from scratch.
 *
 * Until now the app assumed you already had this — the empty state said
 * "upload a .study.json" without saying where one comes from, and the spec
 * lived only in a file in the repo. This hands it over.
 *
 * It is the generator spec verbatim, wrapped in the two lines of framing a
 * chat needs: what to do, and where the notes go. `studies`: the student's
 * exams ask about the studies on the slides, so each is taught in depth.
 */
export function buildNewCoursePrompt(notes?: string, previous?: Course, studies = false): string {
  return `I want you to turn my course notes into an Arborous study course.

Your full instructions are below. Follow them exactly — especially the
four-pass reading procedure and the coverage obligations — and reply with the
\`.study.json\` file's JSON and nothing else.

════════ YOUR INSTRUCTIONS ════════

${generatorSpec(studies)}

${teacherNotesBlock(notes)}${previousLectureBlock(previous)}════════ MY SOURCE MATERIAL ════════

<<< ATTACH YOUR SLIDES / PDF / NOTES TO THIS MESSAGE (NOT ONLY AS PROJECT FILES), OR PASTE THEM BELOW THIS LINE >>>
`;
}
