// Imported straight from the repo's CLAUDE.md so the prompt the app hands out
// is byte-for-byte the spec the app parses. Editing CLAUDE.md updates both.
import GENERATOR_SPEC from '../../CLAUDE.md?raw';

/**
 * The prompt for generating a course from scratch.
 *
 * Until now the app assumed you already had this — the empty state said
 * "upload a .study.json" without saying where one comes from, and the spec
 * lived only in a file in the repo. This hands it over.
 *
 * It is the generator spec verbatim, wrapped in the two lines of framing a
 * chat needs: what to do, and where the notes go.
 */
export function buildNewCoursePrompt(): string {
  return `I want you to turn my course notes into an Arborous study course.

Your full instructions are below. Follow them exactly — especially the
four-pass reading procedure and the coverage obligations — and reply with the
\`.study.json\` file's JSON and nothing else.

════════ YOUR INSTRUCTIONS ════════

${GENERATOR_SPEC}

════════ MY SOURCE MATERIAL ════════

<<< ATTACH YOUR SLIDES / PDF / NOTES, OR PASTE THEM BELOW THIS LINE >>>
`;
}
