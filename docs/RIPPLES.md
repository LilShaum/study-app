# Ripples: what else to check when something changes

The owner, 2026-11-22: "any time some part of the app is changes, all the
other parts of the app that relate to it need to be checked to see how they
need to be changed accordingly" (after the generator prompt went on
describing an order Learn had stopped using).

Before a change is committed:

1. **Grep for the old behaviour's words** (its label, the order it used, the
   number it assumed) across `src/`, `prompts/`, `docs/EXPECTATIONS.md` and
   `src/routes/HelpRoute.tsx`, and fix every place that still says it.
2. **Walk the row below for what changed**, and either change each place or
   say in the commit why it needs nothing.
3. Add a row when a new dependency is found.

| When this changes | Check these |
|---|---|
| How Learn orders a step, Read/Recall/Apply, Questions first, the section's first card | `prompts/generator.md` (Quality bar part 1, the `explain` and written-answer passages), Help's Learn text, EXPECTATIONS Learn, the simulator (`sim/`), What's new |
| How a card type is shown or marked (mcq, multi, flashcard, written, problem, definition, graphic) | `prompts/generator.md` Item types; every prompt builder in `src/lib/build*Prompt.ts` and `evenOptions.ts`; `courseHealth.ts` checks; `EditItemForm`; the practice test (`TestRoute`); Practice's kinds (`practiceChoice`, `makeKinds`); Help |
| Options: how many, their order, None/All | `McqCard`, `TestRoute`, `optionOrder`, `courseHealth`, `evenOptions`, `buildFixPrompt`, `EditItemForm`, the generator prompt |
| A way to study (Today, Learn, Practice, the practice test, the adaptive quiz) | the library, lecture and class pages; Help; EXPECTATIONS; CLAUDE.md's line for it; `docs/proposals/ecosystem.md`; the simulator if it schedules |
| A field in the course file | `src/schema/course.ts`, `parseCourse`, the generator prompt's output contract, `EditItemForm`, sync (`syncMerge`), share and export, Fix and Add prompts |
| How the AI hands back its work | `NewCourseDialog`, `AddToCourseDialog`, `ClassEvenOutDialog`, `lib/handBack.ts`, every prompt builder, Help |
| Anything a student reads | Help, the first run (`Onboarding`), What's new, tests that match the copy, `node scripts/ui-dashes.mjs` |
| The memory model or scheduling | the simulator, Today, Review, the adaptive quiz's planner, Progress's forecast |
