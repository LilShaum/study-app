---
name: scope-check
description: Sizes every Arborous ask before work starts and proves the result matches that size before it is called done, so a big ask ("rework how X feels", "overhaul", "redesign", "make it feel intentional", "the whole app", "fundamental", a part or round of a plan) never comes back as small polish a student would barely notice, and an ask the owner has made before gets a new approach instead of a reworded old one. Use at the START of any request to build, change, improve, audit or redesign something in Arborous, and again BEFORE saying it is done or showing it. Use it even when the ask sounds small, since sizing it is the point.
---

# Scope check: the size of the change matches the size of the ask

The owner, 2026-11-27: "an issue I faced a lot while working on arborous is
asking for big wider scoped macro updates changes and improvements to how
the app functions and feels, and then the ai goes and focuses on minute
fixes or changes that a user would barely notice." The same complaint is on
record before: the grading session "kept focusing on the smallest things
that didnt matter" (2026-11-17); an overhaul of New lecture reworked only
step 1 (Testing 7); "realistic" motion came back as leaves starting 0.2 s
sooner; "no made-up lecture" was asked three times and the lecture was kept
each time (docs/FEEDBACK.md).

Why it keeps happening: small edits are safe, quick to verify and easy to
describe, so they win by default. Keeping what was built feels respectful
of earlier work. A list of twenty small fixes looks like a lot of work. None
of that is what the owner asked for. This skill makes the size explicit
before work starts, and checks it with evidence before work ends.

## 1. Size the ask (before anything else)

Read the owner's words, and say which size it is in the first line of the
plan:

| Size | Their words sound like | What done looks like |
|---|---|---|
| **Macro** | rework, overhaul, reimagine, redesign, "how it feels", "the whole", fundamental, "feels cheap / slop / tacked on", every screen, a part of a plan | A returning student notices within ten seconds, without the old version beside it. Layout, flow, hierarchy, motion or what a screen is for has changed. |
| **Meso** | improve X, make X intuitive / clearer, fix how X works | The student does X differently, or understands it without help. One screen or flow changes shape. |
| **Micro** | a named fault: this colour, this word, this dot, this tap | Exactly that, plus its ripples. |

When unsure between two sizes, take the bigger one and propose it (project
instruction: "If scope is unclear, propose the big version first"). Do not
shrink an ask because the big version is harder to verify or touches code
that already works.

## 2. Has the owner asked this before?

Search `docs/ASKS.md` and `docs/FEEDBACK.md` for the subject (the feature's
name and two or three words from the ask). If the same thing was asked
before:

- Quote the earlier asks, with dates, at the top of the plan.
- Say what was built each time and why it did not land. A repeat means the
  previous approach failed, so rewording it or nudging it again is the
  wrong move. The new plan must differ in kind: removing what was kept,
  changing the structure, not the wording.
- If you cannot see why it failed, that is the one question to ask.

## 3. For macro and meso asks: write the change contract

Before building, write down (in the plan, and in the proposal doc if there
is one):

1. **What a student will notice**, three to six lines, each something you
   could point at in a screenshot at normal size: "the lecture page opens
   on the tree, full width, with Start under the thumb", not "improved
   spacing".
2. **What is removed or replaced.** A macro change that only adds has
   usually not changed the feel. Name what goes.
3. **The cheap version, named so it is not built**: the tweak-sized
   reading of this ask (a colour, a padding, a reworded line, a fade
   0.2 s sooner) that would technically address the words.
4. **Which screens move**, and which of them the student meets first.

Keep the list ordered by how much a student would notice, largest first,
and build in that order. Polish that comes up along the way goes to the
end of the list, or to ASKS as its own small item; it never stands in for
the big change.

## 4. Before calling it done: prove the size

1. Screenshot before (the base branch) and after, every screen the
   contract names, with `scripts/screenshots.mjs`, then compare:

   ```bash
   # before: a worktree of the base branch, built
   git worktree add ../before <base-branch> && (cd ../before && npm ci && npm run build \
     && node scripts/screenshots.mjs <scratch>/before)
   npm run build && node scripts/screenshots.mjs <scratch>/after
   node scripts/compare-shots.mjs <scratch>/before <scratch>/after <scratch>/compare
   ```

   It prints how much of each screen visibly changed (untouched < 3%,
   touched 3 to 20%, reworked > 20%) and writes a side-by-side page with
   the changes marked. The numbers are coarse on purpose: a recoloured
   hairline does not count, a new layout does. A reworded paragraph
   counts a little, so read the pictures, not only the numbers.
2. **For a macro ask, the screens the contract names should mostly read
   "reworked".** If they read "touched" or "untouched", the work is not
   done, whatever the diff size. Go back to the contract's first line.
3. Look at the side-by-side page at normal size, not zoomed, as a student
   who last opened the app a week ago. Would they say "it changed"? Write
   that sentence for each screen.
4. Tick each line of the contract against a screenshot. A line without
   one is not done.
5. Put the before/after pictures where the owner reviews (the review page),
   so they can judge the size themselves.

Then go on to the owner's own test (phone, zoomed, both themes, scrolled to
the bottom, several taps; CLAUDE.md "Done means checked the way the owner
tests") and the `taste-review` skill for whether the change is good, not
only big.

## When reporting

Say the size you read the ask as, in one line at the bottom with the other
decisions ("Read as macro: the lecture page's layout and flow, not its
colours"), so the owner can correct the reading before a second round is
spent on it.
