# Organising the code and removing leftovers

The owner, 2026-11-27: "I want the code to be organized and easy for any ai
to work on and find what it needs, and any vestigial parts to be removed that
have somehow evaded previous searches, and similarly for things on the
repository."

Audited 2026-11-27 against `claude/project-status-review-rv4e28` (all current
work, 112 commits ahead of `main`) while part 4 was being built on it.

## How to decide

What "easy for any AI to find" means in practice: a new session lands with no
memory, reads `CLAUDE.md`, and must get from a question ("where is the Learn
order decided?") to the right file in one or two hops, without reading stale
docs that contradict the code. So the measures are: one entry point that maps
the repo, every doc labelled current or historical, every source file saying
what it is for in its first lines, and nothing in the tree that nothing uses.
"Leftovers that evaded searches" means the searches were by hand; the fix that
lasts is a tool that finds them on every pull request.

## What the audit found

**Docs (the biggest cost to a new session).** 45 markdown files in `docs/`
with no index. `docs/HANDOFF.md` says "Read this first" and "Last updated
2026-10-11", then holds a 700-line dated done-log through 2026-11-25: a new
session reads history to find the present. `docs/next.md` stopped on
2026-10-19 and points at work long finished. Five audits and two briefs are
finished records mixed in with live docs. 27 proposals with no mark of which
are built, open or on hold.

**Code.** Found with knip (a dead-code finder), which had never been run:
- `src/components/items/EditableItem.tsx`: nothing imports it (BrowseItem
  replaced it and only mentions it in a comment).
- 26 exports used only inside their own file (constants, helpers), which
  make a file's public surface look bigger than it is; `sim/random.ts`
  `pick` is used nowhere.
- 79 of 220 source files have no header comment saying what they are for,
  including most routes, stores and the biggest lib files (growTree,
  buildSessionItems, courseHealth, cloud).
- `src/lib/` is 99 files in one flat folder; the largest files are
  `TestRoute.tsx` (1,771 lines) and `CardSession.tsx` (1,464).

**Repo.** CI runs build and tests only after a push to `main`, so nothing
checks a pull request before it merges. Seven remote branches besides the
work branch and `main`:

| Branch | Last commit | State |
|---|---|---|
| `claude/fable-audit` | 2026-09-26 | No shared history with main (history was rewritten since). Its only files not in the work branch are two since-removed components. Its audit is in `docs/archive/audits/`. |
| `claude/festive-ramanujan-bf7kqn` | 2026-10-02 | Same, plus **`psyc305-lectures-1-4.study.json`: real course content in the public repo**. |
| `claude/fresh-eyes-review` | 2026-10-13 | No shared history; nothing not already carried over. |
| `claude/learn-and-classes` | 2026-10-11 | Same. |
| `claude/learn-review` | 2026-10-11 | Same. |
| `claude/grade-2026-11-16` | 2026-11-17 | Fully contained in the work branch. |

The course file is in no other branch's history.

## Options weighed

**Docs: rewrite in place, or index and archive?** Rewriting HANDOFF, ASKS and
EXPECTATIONS into one tidy doc reads best but fights the part 4 session,
which edits ASKS, FEEDBACK and EXPECTATIONS daily, and loses the owner's
dated words that CLAUDE.md asks to keep. Indexing (one `docs/README.md` that
lists every doc with its status) and moving finished records to
`docs/archive/` keeps every word, touches none of the live files, and gives
the one-hop map. Index and archive wins. HANDOFF is cut into the parts of
the brief that still hold, with its done-log, old feature list and old
roadmap moved word for word to `docs/archive/history.md` (part 4 confirmed
it is not editing HANDOFF).

**Code map: hand-written or generated?** A hand-written map in README goes
stale the week after (README's layout section already lists stores that are
gone and misses half). A map generated from each file's header comment,
checked in CI, stays true and pushes every new file to say what it is for.
Generated wins.

**`src/lib/`: regroup into folders now or later?** Domain folders
(scheduling, prompts, content checks, tree, sync) would help navigation, but
moving 99 files rewrites imports across the files part 4 is editing, a
guaranteed merge mess. With the generated map grouping files by domain, most
of the benefit comes without moving anything. Later, after part 4 merges, as
its own PR; the same for splitting TestRoute and CardSession.

**Leftover guard: a script of our own, or knip?** knip is the standard tool,
understands TypeScript, Vite and Vitest, and needs one small config. knip.

## Plan

1. **Now, on `claude/project-thread-jnds9h` (one PR):**
   - `knip.json` and a pull-request workflow (`.github/workflows/checks.yml`)
     running build, lint, tests and knip, so leftovers fail the PR.
   - Delete `EditableItem.tsx` and `sim/random.ts` `pick`; drop `export`
     from the 26 internal-only names.
   - Header comments on the 34 files without one that part 4 is not
     editing; `scripts/code-map.mjs` writing `docs/CODEMAP.md`, grouped by
     domain, checked in the workflow.
   - `docs/README.md`: every doc, what it is for, current or historical.
     Move `docs/audits/`, `docs/briefs/` and the used-up `docs/prompts/` to
     `docs/archive/`; delete `docs/next.md` (superseded by ASKS); fix the
     paths that point at them.
   - README's layout section points at the code map instead of a stale list.
   - HANDOFF cut to the brief (745 lines to about 250); the rest to
     `docs/archive/history.md`. Its checks and ship steps updated to the
     pull-request flow.
2. **Owner's yes needed:** delete the six branches above (the course file
   with them). Deleting a branch cannot be undone; nothing in them is lost
   (checked file by file). GitHub can still serve a deleted commit to
   someone who has its exact link; if that matters for the course file,
   GitHub Support can purge it.
3. **After part 4 merges:** header comments on the part 4 files; `src/lib/` into domain folders;
   split TestRoute and CardSession.
