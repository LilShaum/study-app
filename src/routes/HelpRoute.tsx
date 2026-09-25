import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '@/components/Icon';
import { useOnboardingStore } from '@/store/onboarding';
import { storageUsage } from '@/lib/safeStorage';
import { scrollToAnchor } from '@/lib/scrollToAnchor';

interface HelpSection {
  id: string;
  title: string;
  body: ReactNode;
}

const MODE_ROWS: { icon: IconName; name: string; what: string; scored: boolean }[] = [
  {
    icon: 'target',
    name: 'Learn',
    what: 'Walks a section as a taught sequence — definitions and examples first, then flashcards and typing each term from its meaning, then questions. Built from the items you already have; nothing is generated.',
    scored: true,
  },
  {
    icon: 'help-circle',
    name: 'Quiz',
    what: 'Multiple-choice questions one at a time, with the explanation after you answer.',
    scored: true,
  },
  {
    icon: 'layers',
    name: 'Flashcards',
    what: 'Prompt on the front, answer on the back. You mark yourself got it or missed it.',
    scored: true,
  },
  {
    icon: 'file-text',
    name: 'Terms',
    what: 'The meaning is shown; you type the term. Slips of the keyboard are forgiven, a different term is not — and if the grader gets it wrong, one tap overrules it.',
    scored: true,
  },
  { icon: 'shuffle', name: 'Mixed', what: 'Every item type, shuffled — closest to exam conditions. Definitions are asked for, not shown.', scored: true },
  {
    icon: 'bar-chart',
    name: 'Weakest First',
    what: 'Questions, flashcards and terms ordered by your own accuracy, shakiest first. Items you have never seen sit in the middle — ahead of what you have nailed, behind what you keep getting wrong.',
    scored: true,
  },
  {
    icon: 'repeat',
    name: 'Review',
    what: 'Appears on a course once something you have studied starts to fade. The app estimates, item by item, how likely you are to still recall it — rising each time you get it right after a gap, falling when you miss — and brings back the faintest first. Give the course an exam date (Course details) and it aims for the day of the exam instead: items that would be faint by then come back shortly before it.',
    scored: true,
  },
  {
    icon: 'repeat',
    name: 'Review Missed',
    what: 'Only items you have missed more often than you have got. It empties as you improve, which is the point.',
    scored: true,
  },
  {
    icon: 'book-open',
    name: 'Browse',
    what: 'The whole course as a readable feed. This is also where you edit: every item has a pencil to change it and a bin to remove it, and each section has an "add item" button.',
    scored: false,
  },
];

const SHORTCUTS: { keys: string; what: string }[] = [
  { keys: '1 – 4', what: 'Pick an option on a multiple-choice question' },
  { keys: 'Enter', what: 'Check your answer or move on' },
  { keys: 'Space', what: 'Flip a flashcard' },
  { keys: 'G / M', what: 'Grade a flipped flashcard: got it / missed it' },
  { keys: '← →', what: 'Previous / next item' },
  { keys: 'Esc', what: 'Leave the session and go back to the course' },
];

const SECTIONS: HelpSection[] = [
  {
    id: 'start',
    title: 'Getting a course in',
    body: (
      <>
        <p>
          A course is a <code className="rounded border border-border px-1 font-mono text-text-2">.study.json</code>{' '}
          file built from <em>your</em> notes — a lecture deck, a transcript, a textbook chapter, a
          photo of handwriting. Arborous does not generate it; you do, with an AI assistant, using
          the prompt the app hands you.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            On the library screen, press <strong>New course</strong>.
          </li>
          <li>
            Step 1 copies a long generator prompt to your clipboard. Paste it into a new chat with
            Claude, and attach or paste your notes in the same message.
          </li>
          <li>
            It replies with JSON. Save it as <span className="font-mono">something.study.json</span>{' '}
            (or just copy the text).
          </li>
          <li>
            Back in step 2, paste the JSON or open the file. You get a preview before anything is
            saved.
          </li>
        </ol>
        <p className="mt-2">
          Already have a <span className="font-mono">.study.json</span> from somewhere else? Use{' '}
          <strong>Upload</strong> instead.
        </p>
      </>
    ),
  },
  {
    id: 'modes',
    title: 'The study modes',
    body: (
      <>
        <p>Open a course and pick a mode. They all draw on the same items — what differs is the order and the filter.</p>
        <ul className="mt-3 space-y-3">
          {MODE_ROWS.map((m) => (
            <li key={m.name} className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-accent">
                <Icon name={m.icon} size={18} />
              </span>
              <span>
                <span className="font-medium text-text">{m.name}</span>
                {m.scored ? (
                  <span className="ml-2 rounded border border-border px-2 py-0.5 text-[11px] font-medium text-text-2">
                    scored
                  </span>
                ) : (
                  <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] text-text-3">
                    reading
                  </span>
                )}
                <span className="block text-text-2">{m.what}</span>
              </span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'resume',
    title: 'Picking up where you left off',
    body: (
      <>
        <p>
          Once you are a few cards into a session, Arborous remembers where you are. Leave, close
          the tab, come back tomorrow — a <strong>Continue</strong> bar appears at the top of that
          course, naming the mode and how far in you got.
        </p>
        <p className="mt-2">
          Opening a mode from its own tile always starts fresh, so Continue is the only thing that
          resumes and you are never dropped somewhere you didn&rsquo;t ask to be. Finishing a
          session clears it, and the × on the bar forgets it deliberately.
        </p>
        <p className="mt-2 text-text-3">
          It remembers the <em>item</em>, not the position, so it still lands on the right card in
          the modes that reshuffle (Mixed, Review Missed) or reorder as your accuracy changes
          (Weakest First). The cards after it are ordered freshly.
        </p>
      </>
    ),
  },
  {
    id: 'sections',
    title: 'Studying one section at a time',
    body: (
      <>
        <p>
          The section list on a course page is clickable — it is not just a table of contents. Open a
          section and you get its own accuracy, a breakdown of what it contains, and the same study
          modes scoped to that section alone.
        </p>
        <p className="mt-2">
          On a 150-item course that is usually what you want: &ldquo;study everything or
          nothing&rdquo; is the wrong choice when you already know which two topics are weak.
        </p>
        <p className="mt-2">
          Inside a whole-course session there is a section dropdown above the card, showing which
          section you are in and jumping to any other. It is absent in Mixed, Weakest First and
          Review Missed, where the items are deliberately not in section order.
        </p>
      </>
    ),
  },
  {
    id: 'diagrams',
    title: 'Finding the diagrams',
    body: (
      <p>
        Diagrams live inside their sections alongside everything else, so a course page has a{' '}
        <strong>Diagrams</strong> link that collects every one of them onto a single scrollable page,
        grouped by section. The link only appears when the course actually has diagrams in it.
      </p>
    ),
  },
  {
    id: 'tree',
    title: 'Reading the tree',
    body: (
      <>
        <p>
          Every course grows its own tree, and its shape comes from the course: one branch per
          section, longer for bigger sections. That part never changes. What changes is the leaves.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>A section you have never studied is bare wood.</li>
          <li>
            Studying it puts it in leaf — more of the section, answered well, means a fuller crown.
          </li>
          <li>
            As what you learned starts to fade, the leaves droop and fall, and they lie on the ground
            under the branch. A studied branch never goes completely bare.
          </li>
          <li>Reviewing brings them back, in the same places they fell from.</li>
        </ul>
        <p className="mt-2">
          The fading uses the same estimate as <strong>Review</strong>, so a tree losing its leaves
          and a Review list with items in it are the same news.
        </p>
      </>
    ),
  },
  {
    id: 'scoring',
    title: 'What counts as progress',
    body: (
      <>
        <p>
          <strong>Multiple-choice questions, flashcards and typed terms are scored</strong>. A
          definition is scored through its term: shown the meaning, you type the word. Worked
          examples and diagrams are read, not marked — they never appear in an accuracy
          figure, and they never turn up in Review Missed.
        </p>
        <p className="mt-2">
          Every attempt is stored per item, so the same item studied in three different modes builds
          one shared record. Two things read that record:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Review Missed</strong> — a yes/no filter: missed more often than got.
          </li>
          <li>
            <strong>Weakest First</strong> — a ranking, so an item you get right three times in five
            still shows up near the front even though Review Missed has already dropped it.
          </li>
        </ul>
        <p className="mt-2">
          <strong>View progress</strong> on a course page breaks the same figures down by section
          and by item type.
        </p>
      </>
    ),
  },
  {
    id: 'growing',
    title: 'Adding to a course you already have',
    body: (
      <>
        <p>Two different buttons on a course page, for two different problems:</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>Add material</strong> — you have new notes (next week&rsquo;s lecture, a tutorial
            sheet). It gives you a prompt to generate items from that new source and merge them in.
          </li>
          <li>
            <strong>More practice</strong> — the notes have not changed, but you have run out of
            questions. This prompt needs no notes at all: every item carries a quote from your
            source, so the prompt reconstructs enough of the material for an assistant to write more
            items against it.
          </li>
          <li>
            <strong>Fix gaps</strong> — hands the course check&rsquo;s own findings back to the AI
            that wrote the course. See below.
          </li>
        </ul>
        <p className="mt-2">
          Both merge into the existing course: ids that would collide are renamed, and items that ask
          the same thing as one you already have are skipped. You see the plan before it applies.
        </p>
      </>
    ),
  },
  {
    id: 'organising',
    title: 'Naming and tagging your courses',
    body: (
      <>
        <p>
          <strong>Edit details</strong> on a course page changes its title, course code, subject,
          description and tags. The generator&rsquo;s title is whatever your slides were called,
          which is rarely what you want to see in a list of twelve courses.
        </p>
        <p className="mt-2">
          Tags are what the library filters by, and the useful ones — <em>week-9</em>, <em>exam</em>,{' '}
          <em>shaky</em> — never come out of a lecture, so this is where they come from. The dialog
          offers tags you already use elsewhere so you don&rsquo;t end up with both &ldquo;week
          9&rdquo; and &ldquo;week-9&rdquo; splitting one filter in two.
        </p>
        <p className="mt-2 text-text-3">
          Renaming is safe: a course is stored under an id fixed when you added it, and your
          progress is keyed to that id, not to the title.
        </p>
      </>
    ),
  },
  {
    id: 'check',
    title: 'The course check panel',
    body: (
      <>
        <p>
          The strip under a course title is a health check. The number it leads with is coverage
          against the generator&rsquo;s own declared term list: the generator writes down every
          technical term it found in your notes, and the app checks how many of those actually got a
          definition.
        </p>
        <p className="mt-2">
          Expand it and it also flags things that quietly make a course worse than it looks — two
          items sharing an id (so they share one score), an answer key pointing outside its options,
          explanations misaligned with their options, terms defined but never asked about.
        </p>
        <p className="mt-2">
          Findings are only worth printing if you can do something about them, so the expanded panel
          has a <strong>Send these to your AI to fix</strong> button. It builds a prompt carrying
          exactly what the check found — the terms with no definition, the terms never tested, and
          any question with a broken answer key, reproduced in full. Paste it into the chat that
          generated the course, because your notes are still there.
        </p>
        <p className="mt-2">
          The prompt asks for a <em>judgement</em> before content. The app can see that a listed
          term never got a definition; it cannot see whether that term was ever worth one — the
          inventory records every technical term in your notes, including ones mentioned once in
          passing or explicitly ruled out of the exam. So the prompt tells the model that
          &ldquo;not worth an item&rdquo; is a correct answer, and asks it to say which it skipped
          and why before any JSON. You get that verdict list to read.
        </p>
        <p className="mt-2">
          What comes back is <strong>additions and corrections, never a replacement course</strong>.
          New items are merged; a fix to an existing question replaces it under the same id, which
          is what keeps your score on that question. A regenerated course file would carry all-new
          ids and silently wipe your progress, so the prompt tells the model not to send one. You
          see the full plan — what is added, what is fixed and which fields change — before anything
          is applied.
        </p>
        <p className="mt-2 text-text-3">
          Be clear about what this is: the app never sees your original notes, so it can only hold
          the generator to the list it declared. Verifying that every item really traces back to your
          source needs the source, and that check lives in the repository as{' '}
          <code className="font-mono">npm run audit</code>.
        </p>
      </>
    ),
  },
  {
    id: 'keys',
    title: 'Keyboard shortcuts',
    body: (
      <>
        <p>During any card session:</p>
        <ul className="mt-2 space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-baseline gap-3">
              <kbd className="w-20 shrink-0 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-center font-mono text-[11px] text-text-2">
                {s.keys}
              </kbd>
              <span className="text-text-2">{s.what}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-text-3">
          The same hints appear at the bottom of every session, on devices with a keyboard.
        </p>
      </>
    ),
  },
  {
    id: 'data',
    title: 'Where your data lives',
    body: (
      <>
        <p>
          Everything — courses, progress, theme — is stored in this browser, on this device. Nothing
          is uploaded and there is no account. Clearing site data clears your courses with it, so use{' '}
          <strong>Export .study.json</strong> on a course page to keep a copy, or to move a course to
          another device.
        </p>
        <p className="mt-2">
          Arborous also installs as an app and works offline. On iOS: Share → Add to Home Screen. On
          Android and desktop Chrome: the install icon in the address bar, or the ⋮ menu.
        </p>
        <p className="mt-2 text-text-3">
          One iOS quirk worth knowing: a Home Screen app gets its own storage, separate from Safari.
          If you added courses in Safari and then installed, the installed app starts empty — your
          courses are still in Safari. Export them there and upload them in the installed app, or
          just use whichever one already has them.
        </p>
        <p className="mt-2">
          Deleting a course from the library can be undone from the toast that appears — but only
          until it fades.
        </p>
        <div className="mt-2">
          <StorageUsage />
        </div>
        <p className="mt-2 text-text-3">
          If that budget does run out, the app says so rather than pretending: an upload, a merge or
          an edit that could not be written reports itself as unsaved instead of showing a success
          message you would only catch out on the next reload.
        </p>
      </>
    ),
  },
];

/**
 * How much of the browser's storage budget the courses are using.
 *
 * Worth showing because the failure is abrupt and invisible: the budget is
 * about 5MB, a diagram-heavy course is around 100KB, and the first sign of
 * trouble is a save that doesn't happen. A number here means a student can
 * see it coming and export something before that.
 */
function StorageUsage() {
  const usage = storageUsage();
  if (!usage) return null;
  const pct = Math.min(100, Math.round((usage.used / usage.limit) * 100));
  const tight = pct >= 80;
  return (
    <p className={tight ? 'text-warning' : 'text-text-3'}>
      Your courses and progress are using about {Math.round(usage.used / 1024)} KB of the roughly{' '}
      {Math.round(usage.limit / 1024 / 1024)} MB this browser allows ({pct}%)
      {tight ? ' — export a finished course and remove it before it runs out.' : '.'}
    </p>
  );
}

/** Brings back the first-launch welcome, which is otherwise unreachable. */
function ReplayWelcome() {
  const reset = useOnboardingStore((s) => s.reset);
  return (
    <button
      type="button"
      onClick={reset}
      className="press tap-safe"
    >
      <Icon name="bulb" size={14} />
      Show the welcome screen again
    </button>
  );
}

/** "/help" — what the app does, including the parts that aren't obvious. */
export function HelpRoute() {
  return (
    <div>
      <Link to="/" className="text-sm text-text-2 hover:text-text">
        ← Library
      </Link>
      <h1 className="mt-3 font-display text-display font-semibold text-text">How Arborous works</h1>
      <p className="mt-2 max-w-prose text-body text-text-2">
        You bring the notes and generate a course from them; the app turns that course into practice
        and keeps score.
      </p>

      <div className="mt-4">
        <ReplayWelcome />
      </div>

      {/*
        Buttons, not anchors.

        These were `<a href="#prompt">`, which under a hash router is not an
        in-page anchor at all: setting the hash to `#prompt` makes the router
        read the route as `/prompt`, match nothing, and fall back to the
        library. Every topic link on the help page quietly threw you out of
        it. There is no href that means "scroll down" when the hash is
        already carrying the route, so the jump is done directly — and it
        moves focus as well as the scroll position, or it only works for
        people using a mouse.
      */}
      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Help topics">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollToAnchor(s.id)}
            className="press tap-safe"
          >
            {s.title}
          </button>
        ))}
      </nav>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section
            key={s.id}
            id={s.id}
            tabIndex={-1}
            className="prose-set scroll-mt-20 border-t border-border pt-6"
          >
            <h2 className="mb-2 font-display text-heading font-semibold text-text">{s.title}</h2>
            <div className="space-y-1 text-small text-text-2">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
