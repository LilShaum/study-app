/**
 * How the prompts ask the AI to return JSON: as a file the student uploads
 * to the app, not text to paste (the paste boxes are gone).
 */
export const FILE_FALLBACK = 'If you cannot make a downloadable file, put the JSON alone in one code block, to be saved as a file.';

/** "Hand back a downloadable file named like `x.json`, containing only the JSON". */
export const handBackFile = (name: string): string =>
  `Hand back a downloadable file named like \`${name}.json\`, containing only the JSON`;
