import { z } from 'zod';

/* ============================================================
   .study.json SCHEMA — must match the vanilla app's format exactly.
   Objects are "loose" (unknown keys pass through) so that importing
   and re-exporting a course is lossless, and so a slightly newer
   generator output isn't rejected outright.
   ============================================================ */

export const SCHEMA_VERSION = '1.0' as const;

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof DifficultySchema>;

const itemBase = {
  id: z.string().min(1),
  difficulty: DifficultySchema.optional(),
  tags: z.array(z.string()).optional(),
  // Short quote/paraphrase of the source notes this item is drawn from.
  // Optional (old files won't have it), but the generator is now required
  // to fill it in — it's the main lever against fabricated content, and
  // lets a student spot-check an item against their own notes.
  source_excerpt: z.string().optional(),
};

export const McqItemSchema = z.looseObject({
  ...itemBase,
  type: z.literal('mcq'),
  question: z.string(),
  options: z.array(z.string()).min(2),
  correct_index: z.number().int().min(0),
  explanation: z.string().optional(),
  // One short reason per wrong option (same order as `options`) for why
  // it's plausible but incorrect — forces real distractors instead of
  // filler like "None of the above".
  distractor_rationale: z.array(z.string()).optional(),
});

export const FlashcardItemSchema = z.looseObject({
  ...itemBase,
  type: z.literal('flashcard'),
  front: z.string(),
  back: z.string(),
  hint: z.string().optional(),
});

export const DefinitionItemSchema = z.looseObject({
  ...itemBase,
  type: z.literal('definition'),
  term: z.string(),
  definition: z.string(),
  example_sentence: z.string().optional(),
  related_terms: z.array(z.string()).optional(),
  also_known_as: z.array(z.string()).optional(),
});

export const ExampleItemSchema = z.looseObject({
  ...itemBase,
  type: z.literal('example'),
  title: z.string(),
  context: z.string().optional(),
  steps: z.array(z.string()).optional(),
  takeaway: z.string().optional(),
});

export const GraphicItemSchema = z.looseObject({
  ...itemBase,
  type: z.literal('graphic'),
  title: z.string(),
  svg: z.string().optional(),
  alt_text: z.string().optional(),
  caption: z.string().optional(),
});

export const StudyItemSchema = z.discriminatedUnion('type', [
  McqItemSchema,
  FlashcardItemSchema,
  DefinitionItemSchema,
  ExampleItemSchema,
  GraphicItemSchema,
]);

export const SectionSchema = z.looseObject({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  order: z.number().optional(),
  items: z.array(StudyItemSchema),
});

export const ItemCountsSchema = z
  .object({
    mcq: z.number(),
    flashcard: z.number(),
    definition: z.number(),
    example: z.number(),
    graphic: z.number(),
  })
  .partial();

export const CourseMetadataSchema = z.looseObject({
  title: z.string(),
  course_code: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  total_items: z.number().optional(),
  item_counts: ItemCountsSchema.optional(),
});

export const CourseSchema = z.looseObject({
  schema_version: z.string(),
  metadata: CourseMetadataSchema,
  sections: z.array(SectionSchema),
});

export type ItemCounts = z.infer<typeof ItemCountsSchema>;
export type CourseMetadata = z.infer<typeof CourseMetadataSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type StudyItem = z.infer<typeof StudyItemSchema>;
export type ItemType = StudyItem['type'];
export type McqItem = z.infer<typeof McqItemSchema>;
export type FlashcardItem = z.infer<typeof FlashcardItemSchema>;
export type DefinitionItem = z.infer<typeof DefinitionItemSchema>;
export type ExampleItem = z.infer<typeof ExampleItemSchema>;
export type GraphicItem = z.infer<typeof GraphicItemSchema>;
export type Course = z.infer<typeof CourseSchema>;
