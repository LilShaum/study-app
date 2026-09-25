import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { scoredEntries } from '@/lib/scored';
import { useCoursesStore } from '@/store/courses';
import { agedProgress, studiedProgress, useProgressStore } from '@/store/progress';
import { toast } from '@/store/toast';
import { Icon, type IconName } from '@/components/Icon';
import { useOnboardingStore } from '@/store/onboarding';
import { storageUsage } from '@/lib/safeStorage';
import { scrollToAnchor } from '@/lib/scrollToAnchor';

interface HelpSection {
  id: string;
  title: string;
  body: ReactNode;
}

// Written for the student, in plain words: what each thing is and how to
// use it. An earlier version explained the app's design decisions instead —
// why a button exists, what a figure is not — which read as filler and
// answered questions nobody asked.
const MODE_ROWS: { icon: IconName; name: string; what: string; scored: boolean }[] = [
  {
    icon: 'target',
    name: 'Learn',
    what: 'Teaches one section at a time: first the definitions and examples, then flashcards and typing the terms, then the questions. From the course page it starts at the next section you have not done.',
    scored: true,
  },
  {
    icon: 'help-circle',
    name: 'Quiz',
    what: 'Multiple-choice questions, with an explanation after each one. A question you have already got right may come back without its options, and you type the answer.',
    scored: true,
  },
  {
    icon: 'layers',
    name: 'Flashcards',
    what: 'Read the front, think of the answer, flip the card, and mark whether you got it.',
    scored: true,
  },
  {
    icon: 'file-text',
    name: 'Terms',
    what: 'You are shown a definition and type the term. Small typos are accepted; a different term is not. If you think it marked you wrongly, tap to change it.',
    scored: true,
  },
  { icon: 'shuffle', name: 'Mixed', what: 'Everything in the course, shuffled.', scored: true },
  {
    icon: 'bar-chart',
    name: 'Weakest first',
    what: 'Everything you can be scored on, starting with what you get wrong most often. Things you have not tried yet come in the middle.',
    scored: true,
  },
  {
    icon: 'repeat',
    name: 'Review',
    what: 'Brings back what you have studied as you start to forget it, most forgotten first, 50 at a time. If you set an exam date in Edit details, it also makes sure things are fresh on the day.',
    scored: true,
  },
  {
    icon: 'repeat',
    name: 'Review missed',
    what: 'Only the items you have got wrong more often than right.',
    scored: true,
  },
  {
    icon: 'book-open',
    name: 'Browse',
    what: 'The whole course to read through. You can edit, delete or add items here.',
    scored: false,
  },
];

const SHORTCUTS: { keys: string; what: string }[] = [
  { keys: '1 – 4', what: 'Choose an option' },
  { keys: 'Enter', what: 'Check your answer, or go to the next item' },
  { keys: 'Space', what: 'Flip a flashcard' },
  { keys: 'G / M', what: 'Mark a flashcard as got it / missed it' },
  { keys: '← →', what: 'Previous / next item' },
  { keys: 'Esc', what: 'Leave the session' },
];

const SECTIONS: HelpSection[] = [
  {
    id: 'start',
    title: 'Getting a course in',
    body: (
      <>
        <p>
          A course is made from your own notes, slides or textbook pages. You make it with an AI
          chat, using a prompt the app gives you.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            On the library page, tap <strong>New course</strong>.
          </li>
          <li>
            Copy the prompt and paste it into a chat with an AI such as Claude. Attach your notes in
            the same message.
          </li>
          <li>
            Copy the reply and paste it into the New course box. Or save it as a{' '}
            <span className="font-mono">.study.json</span> file and open that.
          </li>
          <li>Check the preview, then add the course.</li>
        </ol>
        <p className="mt-2">
          If someone gives you a <span className="font-mono">.study.json</span> file, use{' '}
          <strong>Upload</strong>.
        </p>
      </>
    ),
  },
  {
    id: 'modes',
    title: 'Ways to study',
    body: (
      <ul className="space-y-3">
        {MODE_ROWS.map((m) => (
          <li key={m.name} className="flex gap-3">
            <span className="mt-0.5 shrink-0 text-text-3">
              <Icon name={m.icon} size={18} />
            </span>
            <span>
              <span className="font-medium text-text">{m.name}</span>
              <span className="mark ml-2 text-text-3">{m.scored ? 'scored' : 'reading'}</span>
              <span className="block text-text-2">{m.what}</span>
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'resume',
    title: 'Picking up where you left off',
    body: (
      <p>
        If you leave a session partway through, the course page shows a <strong>Continue</strong>{' '}
        bar that takes you back to the same card. Starting a mode from its own button always begins
        again. Finishing the session, or tapping × on the bar, clears it.
      </p>
    ),
  },
  {
    id: 'sections',
    title: 'Studying one section',
    body: (
      <>
        <p>
          Tap a section on a course page to see how you are doing in it and to study just that
          section.
        </p>
        <p className="mt-2">
          In a whole-course session, the menu above the card shows which section you are in and lets
          you jump to another. It is not shown in Mixed, Weakest first, Review or Review missed,
          because those are not in section order.
        </p>
      </>
    ),
  },
  {
    id: 'diagrams',
    title: 'Diagrams',
    body: (
      <p>
        If a course has diagrams, its page has a <strong>Diagrams</strong> link that shows them all
        on one page.
      </p>
    ),
  },
  {
    id: 'tree',
    title: 'The tree',
    body: (
      <>
        <ul className="list-disc space-y-1 pl-5">
          <li>Each branch is a section of the course.</li>
          <li>A section you have not studied has no leaves.</li>
          <li>
            Leaves grow as you study a section. As you forget it they fall and collect under the
            tree, but a branch you have studied always keeps a few.
          </li>
          <li>Reviewing the section grows them back.</li>
        </ul>
        <p className="mt-2">
          Tap the tree on a course page to open it larger. Choose a branch to see its name, how many
          items are due, and a button to review just that section; the leaves it has lost fall as
          you choose it. At the end of a session, the leaves you won back rise from the ground.
        </p>
      </>
    ),
  },
  {
    id: 'scoring',
    title: 'Scores and progress',
    body: (
      <>
        <p>Questions, flashcards and typed terms are scored. Examples and diagrams are for reading.</p>
        <p className="mt-2">
          An answer counts wherever you give it, in any mode. The app uses your answers to work out
          how well you remember each item, and that decides what Review brings back, how full the
          tree is, and the order of Weakest first. <strong>Progress</strong> on a course page shows
          it section by section.
        </p>
      </>
    ),
  },
  {
    id: 'growing',
    title: 'Adding to a course',
    body: (
      <>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Add material</strong> is for new notes, such as next week&rsquo;s lecture. It
            gives you a prompt to turn them into new items.
          </li>
          <li>
            <strong>More practice</strong> is for more questions on the notes you already have. It
            does not need the notes again.
          </li>
          <li>
            <strong>Send these to your AI to fix</strong>, in the course check, asks the AI to fix
            what the check found.
          </li>
        </ul>
        <p className="mt-2">
          Each time, you paste the AI&rsquo;s reply back in and see what will change before
          anything is added. Your scores are kept.
        </p>
      </>
    ),
  },
  {
    id: 'organising',
    title: 'Course details',
    body: (
      <p>
        <strong>Edit details</strong> on a course page changes the title, course code, subject,
        description, tags and exam date. The course code is what shows at the top of the screen, and
        tags let you filter the library. Renaming a course keeps your progress.
      </p>
    ),
  },
  {
    id: 'check',
    title: 'The course check',
    body: (
      <>
        <p>
          The line under a course&rsquo;s title checks the course the AI made. It shows how many of
          the terms from your notes got a definition, and lists things worth checking, such as
          questions where the right answer is easy to guess, or terms that no question makes you
          use.
        </p>
        <p className="mt-2">
          A red cross means something is broken, such as a question that cannot be marked. Tap the
          line for details. <strong>Send these to your AI to fix</strong> gives you a prompt for the
          chat that made the course. What comes back fixes those items without replacing your
          course or your scores.
        </p>
        <p className="mt-2">
          The check cannot see your original notes, so it cannot tell you whether every item is
          accurate.
        </p>
      </>
    ),
  },
  {
    id: 'keys',
    title: 'Keyboard shortcuts',
    body: (
      <>
        <ul className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-baseline gap-3">
              <kbd className="w-20 shrink-0 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-center font-mono text-[11px] text-text-2">
                {s.keys}
              </kbd>
              <span className="text-text-2">{s.what}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">These are also shown at the bottom of each session.</p>
      </>
    ),
  },
  {
    id: 'data',
    title: 'Where your courses are saved',
    body: (
      <>
        <p>
          Your courses and progress are saved in this browser, on this device. Nothing is uploaded
          and there is no account. If you clear the browser&rsquo;s data, your courses go with it,
          so use <strong>Export</strong> on a course page to keep a copy or to move a course to
          another device.
        </p>
        <p className="mt-2">
          Arborous can be installed as an app, and works offline. On an iPhone: Share, then Add to
          Home Screen. On Android or desktop Chrome: the install icon in the address bar, or the ⋮
          menu.
        </p>
        <p className="mt-2">
          On an iPhone the installed app has its own storage, separate from Safari, so courses added
          in Safari will not appear in it. Export them from Safari and upload them in the app.
        </p>
        <p className="mt-2">If you delete a course by mistake, tap Undo on the message that appears.</p>
        <div className="mt-2">
          <StorageUsage />
        </div>
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
      Your courses are using about {Math.round(usage.used / 1024)} KB of the {Math.round(usage.limit / 1024 / 1024)}{' '}
      MB this browser allows ({pct}%).
      {tight ? ' Export a course you have finished and remove it to make room.' : ''}
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

/**
 * Testing tools, shown only at #/help?devtools and linked from nowhere, so
 * students never see them. Forgetting takes real days, so without a way to
 * fast-forward, the leaves falling and growing back cannot be tried on the
 * day they are built.
 *
 * A test copy is its own course, so the real one and its progress are never
 * touched: every scorable item is marked answered right, just now or a week
 * ago. "A day later" / "A week later" then age any course's answer times.
 */
function TestingTools() {
  const courses = useCoursesStore((s) => s.courses);
  const addCourse = useCoursesStore((s) => s.addCourse);
  const navigate = useNavigate();

  const age = (id: string, title: string, days: number) => {
    useProgressStore.setState((s) => ({
      byCourse: { ...s.byCourse, [id]: agedProgress(s.byCourse[id] ?? {}, days) },
    }));
    toast(`${title}: moved ${days === 1 ? 'a day' : `${days} days`} into the future.`, { type: 'success' });
  };

  const testCopy = (id: string, daysAgo: number) => {
    const course = courses[id];
    const copy = { ...course, metadata: { ...course.metadata, title: `${course.metadata.title} (test copy)` } };
    const copyId = addCourse(copy);
    const seeded = studiedProgress(
      scoredEntries(course.sections.flatMap((s) => s.items)).map((e) => e.id),
      daysAgo,
    );
    useProgressStore.setState((s) => ({ byCourse: { ...s.byCourse, [copyId]: seeded } }));
    navigate(`/study/${copyId}`);
  };

  return (
    <section className="mt-8 border-t border-border pt-6">
      <h2 className="mb-2 font-display text-heading font-semibold text-text">Testing</h2>
      <p className="text-small text-text-2">
        A test copy is a separate course with every item marked as answered right, so its tree is in
        leaf; your real course is not touched. Aging a course moves its answer times back, so its
        leaves fall; that cannot be undone.
      </p>
      <ul className="mt-3 border-t border-border">
        {Object.entries(courses).map(([id, c]) => (
          <li key={id} className="border-b border-border py-3">
            <span className="block text-small text-text">{c.metadata.title}</span>
            <span className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="press tap-safe" onClick={() => testCopy(id, 0)}>
                Test copy, studied now
              </button>
              <button type="button" className="press tap-safe" onClick={() => testCopy(id, 7)}>
                Test copy, studied a week ago
              </button>
              <button type="button" className="press tap-safe" onClick={() => age(id, c.metadata.title, 1)}>
                A day later
              </button>
              <button type="button" className="press tap-safe" onClick={() => age(id, c.metadata.title, 7)}>
                A week later
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "/help" — what the app does, including the parts that aren't obvious. */
export function HelpRoute() {
  const [search] = useSearchParams();
  return (
    <div>
      <Link to="/" className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← Library
      </Link>
      <h1 className="mt-3 font-display text-display font-semibold text-text">Help</h1>
      {search.has('devtools') && <TestingTools />}

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
      {/* Contents, set the way a book sets them: numbered, ruled, one line
          each. It was twelve stacked buttons — about a thousand pixels of
          chunky boxes on a phone before a word of help. */}
      <nav className="mt-6" aria-label="Help topics">
        <h2 className="mark mb-2 text-text-3">Contents</h2>
        <ol className="border-t border-border">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="border-b border-border">
              <button
                type="button"
                onClick={() => scrollToAnchor(s.id)}
                className="group tap-safe flex w-full items-baseline gap-3 py-2 text-left"
              >
                <span className="mark w-5 shrink-0 tabular-nums text-text-3">{i + 1}</span>
                <span className="text-body text-text group-hover:text-accent">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
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
