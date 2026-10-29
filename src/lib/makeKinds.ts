import type { Course } from '@/schema/course';

/**
 * The kinds of item a student can ask a lecture to have, chosen when it is
 * generated (the owner, 2026-10-29: "check boxes for the user to check off
 * whether they want certain types of items made or not, that way if they
 * just want flash cards for example they will just get flash cards").
 * Fewer kinds is also a shorter reply, so less of the AI's usage.
 */
export type MakeKind = 'mcq' | 'flashcard' | 'terms' | 'written' | 'explain' | 'example' | 'graphic';

export const MAKE_KINDS: { value: MakeKind; label: string }[] = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'flashcard', label: 'Flashcards' },
  { value: 'terms', label: 'Terms to name' },
  { value: 'written', label: 'Written answers' },
  { value: 'explain', label: 'Explanations' },
  { value: 'example', label: 'Worked examples' },
  { value: 'graphic', label: 'Diagrams' },
];

export const ALL_KINDS: MakeKind[] = MAKE_KINDS.map((k) => k.value);

/** What a lecture was made with: everything, unless the student chose (CourseMetadata.make). */
export function kindsOf(course: Course): MakeKind[] {
  const chosen = course.metadata.make?.filter((k): k is MakeKind => (ALL_KINDS as string[]).includes(k));
  return chosen?.length ? chosen : ALL_KINDS;
}

/** The choice as stored on a lecture: nothing when it is everything. */
export function storedKinds(kinds: readonly MakeKind[]): MakeKind[] | undefined {
  return ALL_KINDS.every((k) => kinds.includes(k)) ? undefined : ALL_KINDS.filter((k) => kinds.includes(k));
}

/** How each kind appears in the lecture file, for the model. */
const AS_FILE: Record<MakeKind, string> = {
  mcq: '`mcq` items (multiple choice)',
  flashcard: 'plain one-fact `flashcard` items',
  terms: '`definition` items (terms the student names from their meaning)',
  written: 'written-answer flashcards (a back of numbered points, or tagged short-answer or long-answer)',
  explain: '`explain` items',
  example: '`example` items (worked examples)',
  graphic: '`graphic` items (diagrams)',
};

/** Where what a missing kind would have taught goes instead. */
const INSTEAD: Record<MakeKind, string> = {
  mcq: 'what a multiple-choice question would test (applying, telling apart, predicting) is asked by the kinds kept, a flashcard where there is one',
  flashcard: 'a fact a flashcard would ask is asked by the kinds kept',
  terms:
    'a term is taught and asked through the kinds kept (a flashcard "What is …?" or a question that uses it); leave `metadata.inventory.terms` empty and list each term under `inventory.mentioned`',
  written: 'a key idea is asked by the kinds kept, never as an answer to write',
  explain: 'the connection an explanation would give goes in the explanations of the questions on it',
  example: 'a worked method is asked as a question to work through, in the kinds kept',
  graphic: 'what a diagram shows is asked about in words, in the kinds kept',
};

/**
 * The block a prompt carries when the student chose only some kinds: an
 * override of the spec's item-type rules, with where the content of each
 * missing kind goes, since everything the spec says must be covered still
 * is. Nothing when every kind is chosen.
 */
export function makeOnlyBlock(kinds: readonly MakeKind[]): string {
  const off = ALL_KINDS.filter((k) => !kinds.includes(k));
  if (!off.length || !kinds.length) return '';
  return `════════ WHAT TO MAKE ════════

I want only these kinds of item: ${kinds.map((k) => AS_FILE[k]).join('; ')}. This overrides the spec wherever it asks for another kind.

Do not write: ${off.map((k) => AS_FILE[k]).join('; ')}.

Everything the spec says must be covered is still covered, with the kinds I want:
${off.map((k) => `- ${INSTEAD[k]}.`).join('\n')}

The quality rules hold for every kind I keep.

`;
}
