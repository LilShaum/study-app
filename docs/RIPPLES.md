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
| How work is sized, reviewed, shown or shipped (the workflow, a check, a role) | `docs/WORKFLOW.md`, the `scope-check` and `taste-review` skills, CLAUDE.md (rule lines and the skill table), arborous-design's Checking a change, `scripts/screenshots.mjs` / `compare-shots.mjs` / `preview.mjs` |
| How the owner's feedback is taken in, or a standing rule they state | `.claude/skills/owner-feedback/SKILL.md`, `docs/FEEDBACK.md` (an entry per point), CLAUDE.md (a dated rule line and the skill table), HANDOFF §7, ASKS (the ask), the skill for the area (`arborous-design` for anything a student sees) |
| Options: how many, their order, None/All | `McqCard`, `TestRoute`, `optionOrder`, `courseHealth`, `evenOptions`, `buildFixPrompt`, `EditItemForm`, the generator prompt |
| Reminders: their kinds, wording, timing, or the push tables | `lib/reminderPlan.ts` and its test, `lib/push.ts`, `RemindersField`, the first run's remind page, `supabase/functions/arborous-push` (redeploy through the Supabase connector), `docs/supabase.sql`, the `kind` check on `arborous_reminders`, Help's Reminders, EXPECTATIONS Reminders, docs/proposals/notifications.md |
| A way to study (Today, Learn, Practice, the practice test, the adaptive quiz) | the library, lecture and class pages; Help; EXPECTATIONS; CLAUDE.md's line for it; `docs/proposals/ecosystem.md`; the simulator if it schedules |
| A field in the course file | `src/schema/course.ts`, `parseCourse`, the generator prompt's output contract, `EditItemForm`, sync (`syncMerge`), share and export, Fix and Add prompts |
| How the AI hands back its work | `NewCourseDialog`, `AddToCourseDialog`, `ClassEvenOutDialog`, `lib/handBack.ts`, every prompt builder, Help |
| Where a setting lives, or a new setting (name, theme, reminders, account, backups) | `SettingsRoute` and its tests, the foot of every page (`RootLayout`), Help's "Your data" section, the first run's lines that say where to change things, EXPECTATIONS Settings and Your page, What's new |
| The tree's drawing, its numbers or its leaves | `growTree` and its contract tests (leaves on the wood), `CourseTree` and its tests, the numbers' styles in `index.css` (one marked ink, nothing drawn when hidden), Help's The tree, the first run (grow, fade, find), EXPECTATIONS lecture page; check zoomed, both themes |
| Anything a student reads | Help, the first run (`Onboarding`), What's new, tests that match the copy, `node scripts/ui-dashes.mjs` |
| The generator prompt's rules, or what a lecture must contain | `docs/rubric.md` (its targets), `src/lib/rubric.ts` and its test, `.claude/skills/generate-lecture`, `courseHealth.ts` (a fault the app can see), `buildFixPrompt` |
| The memory model or scheduling | the simulator, Today, Review, the adaptive quiz's planner, Progress's forecast |
