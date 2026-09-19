import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '@/components/Icon';

interface HelpSection {
  id: string;
  title: string;
  body: ReactNode;
}

const MODE_ROWS: { icon: IconName; name: string; what: string; scored: boolean }[] = [
  {
    icon: 'target',
    name: 'Learn',
    what: 'Walks a section as a taught sequence — definitions and examples first, then flashcards, then questions. Built from the items you already have; nothing is generated.',
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
    name: 'Definitions',
    what: 'Term first, meaning revealed on Enter. Reading practice, not a test.',
    scored: false,
  },
  { icon: 'shuffle', name: 'Mixed', what: 'Every item type, shuffled — closest to exam conditions.', scored: true },
  {
    icon: 'bar-chart',
    name: 'Weakest First',
    what: 'Questions and flashcards ordered by your own accuracy, shakiest first. Items you have never seen sit in the middle — ahead of what you have nailed, behind what you keep getting wrong.',
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
  { keys: 'Enter', what: 'Check your answer, reveal a definition, or move on' },
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
          A course is a <code className="rounded bg-accent-light px-1 font-mono text-accent">.study.json</code>{' '}
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
                  <span className="ml-2 rounded-full bg-accent-light px-2 py-0.5 text-[11px] font-medium text-accent">
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
    id: 'scoring',
    title: 'What counts as progress',
    body: (
      <>
        <p>
          Only <strong>multiple-choice questions and flashcards are scored</strong>. Definitions,
          worked examples and diagrams are read, not marked — they never appear in an accuracy
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
            questions or the course missed something. This prompt needs no notes at all: every item
            carries a quote from your source, so the prompt reconstructs enough of the material for
            an assistant to write more items against it, and it names the terms that were listed but
            never defined so those get covered first.
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
              <kbd className="w-20 shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-center font-mono text-[11px] text-text-2">
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
        <p className="mt-2">
          Deleting a course from the library can be undone from the toast that appears — but only
          until it fades.
        </p>
      </>
    ),
  },
];

/** "/help" — what the app does, including the parts that aren't obvious. */
export function HelpRoute() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link to="/" className="text-sm text-text-2 hover:text-text">
        ← Library
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-text">How Arborous works</h1>
      <p className="mt-1 text-text-2">
        You bring the notes and generate a course from them; the app turns that course into practice
        and keeps score.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Help topics">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-2 hover:border-accent-border hover:text-text"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-20 rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-2 text-lg font-semibold text-text">{s.title}</h2>
            <div className="space-y-1 text-sm text-text-2">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
