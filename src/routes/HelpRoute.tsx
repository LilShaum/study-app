import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { scoredEntries } from '@/lib/scored';
import { useCoursesStore } from '@/store/courses';
import { agedProgress, studiedProgress, useProgressStore } from '@/store/progress';
import { useFallenStore } from '@/store/fallen';
import { useStudyLogStore } from '@/store/studyLog';
import { toast } from '@/store/toast';
import { Icon } from '@/components/Icon';
import { BackupButton, RestoreButton } from '@/components/Backup';
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
const MODE_ROWS: { name: string; what: string; scored: boolean }[] = [
  {
    name: 'Today',
    what: 'The one to press most days. It reviews what you are starting to forget, then carries on with new material, and ends when your daily time is up. Set the time, and your exam date and what it covers, from the line under Today on the lecture page. If one exam covers several lectures with the same class code, you can set it on all of them at once there. In the last few days before an exam it makes more room for anything on it you have not studied yet, and in the last three it splits your daily time into three sittings a few hours apart, which does more than one long one. Once your time is used up, coming back a few hours later gives a five-minute catch-up on what you missed, which does more for those cards than going over them again straight away. With more than one lecture, you can set one daily time for all of them under Today on the library page: it is shared by how soon each exam is, so the nearest gets the most.',
    scored: true,
  },
  {
    name: 'Learn',
    what: 'Teaches a section a few terms at a time, about a dozen cards a step. Each step: read the terms, type them from memory, then answer flashcards and questions that use them. Two cards on the same fact are never close together: the second waits for a later step, so you answer it from what you know and not from the card before. A term whose definition spells out its own name is read but not asked; the lecture check lists those, and Fix rewords them. A term gets at most three cards the first time you meet it; the rest, and any card that would come too soon after its twin, open your next sitting as a second look. A term defined the same way in two of your lectures counts once: answer it in one and the other knows. Anything you get wrong comes back a few cards later in the same step, with the passage from your notes. After each step you can stop, and Learn picks up at the next one. At the end it offers the next section. When the lecture says which slides a section covers, Learn starts there: read those slides yourself, tap I’ve read them, and it asks before it shows, which helps even when you get it wrong. Studying alongside your slides works best this way: read a few, put them away, then answer. Skip the reading, at the right of the step line, does this for every lecture: each card is asked before it is shown, with the answer and the passage after. It suits material you have already met in a lecture or your slides; Read first switches back.',
    scored: true,
  },
  {
    name: 'Practice',
    what: 'For drilling a lecture outside the plan, before a class quiz or on a section that feels shaky. Choose which cards (due now, weakest first, missed last time, or everything), which kind (questions, flashcards or typed terms) and which part of the lecture, then Start. Under From you can also pick Studies: every card about an empirical study (its question, method, results and what it shows), or one study. A class page has its own Practice with the same choices across every lecture in the class; it runs one lecture after another, and the end of each offers the next. Your choices are remembered for next time. Today still decides what comes back when, so a card that is not fading yet gains little from more practice. Review on a branch of the tree or on the Progress page is the same as Due now, for that section.',
    scored: true,
  },
  {
    name: 'Practice test',
    what: 'On the Practice page, and on a class page for one exam or the whole class. Only the medium and hard questions, the ones that ask you to use what you know; with Studies picked on the Practice page, only the questions on studies. Across several lectures, a test of 20 or 40 takes from each by its size, or the same from each if you choose Each the same. Answers wait until the end, as in an exam; then you see your score, each section weakest first, and every question you missed with the right answer and why yours was wrong. Retake the missed ones as often as you like. A test in progress is kept if you leave or the app reloads, until you start a new one. Your answers count as practice, so Today knows what the test found.',
    scored: true,
  },
  {
    name: 'Browse',
    what: 'The whole lecture to read through. You can edit, delete or add items here.',
    scored: false,
  },
  {
    name: 'Glossary',
    what: 'Every term in the lecture from A to Z, with its meaning, to look things up. Find it under View on the lecture page.',
    scored: false,
  },
  {
    name: 'Set aside',
    what: 'Not needed? under any card while you study takes it out of study: choose not on my exam (a table the teacher said to skip, a slide shown only to illustrate) or wrong or badly written. Nothing is deleted. Set aside, under View on the lecture page, lists them all with Put back, and Fix there hands the wrong ones to the AI to rewrite. Browse shows them too.',
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
    title: 'Getting a lecture in',
    body: (
      <>
        <p>
          A lecture is made from your own notes, slides or textbook pages. You make it with an AI
          chat, using a prompt the app gives you.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            On the library page, tap <strong>New lecture</strong>.
          </li>
          <li>
            Copy the prompt and paste it into a chat with an AI such as Claude. Attach your slides
            or notes to that same message. Files kept only in a project often reach the AI as text,
            without the diagrams, and the lecture then misses what the diagrams show. If a key
            diagram is dense, attach a screenshot of that slide too.
          </li>
          <li>
            Copy the reply and paste it into the New lecture box. Or save it as a{' '}
            <span className="font-mono">.study.json</span> file and open that.
          </li>
          <li>Check the preview, then add the lecture.</li>
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
        If you leave a session partway through, the lecture page shows a <strong>Continue</strong>{' '}
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
          Tap a section on a lecture page to see how you are doing in it and to study just that
          section.
        </p>
        <p className="mt-2">
          In a whole-lecture session, the menu above the card shows which section you are in and lets
          you jump to another. It is not shown in most Practice sessions, because they are not in section
          order.
        </p>
      </>
    ),
  },
  {
    id: 'diagrams',
    title: 'Diagrams',
    body: (
      <p>
        If a lecture has diagrams, its page has a <strong>Diagrams</strong> link that shows them all
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
          <li>Each branch is a section of the lecture.</li>
          <li>A section you have not studied has no leaves.</li>
          <li>
            Leaves grow as you study a section. As you forget it they fall and collect under the
            tree, but a branch you have studied always keeps a few.
          </li>
          <li>Reviewing the section grows them back.</li>
        </ul>
        <p className="mt-2">
          Tap the tree on a lecture page to open it larger. Choose a branch to see its name, how many
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
          how well you remember each item, and that decides what comes back in Today and Practice, how full the
          tree is, and the order of Weakest first in Practice. <strong>Progress</strong> on a lecture page shows
          it section by section.
        </p>
      </>
    ),
  },
  {
    id: 'growing',
    title: 'Adding to a lecture',
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
            <strong>Send these to your AI to fix</strong>, in the lecture check, asks the AI to fix
            what the check found.
          </li>
          <li>
            <strong>Even out the answers</strong>, in the lecture check when the right answer is
            too often the longest option, asks only for new wrong answers to those questions: a
            short prompt and a short reply.
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
    title: 'Lecture details',
    body: (
      <p>
        <strong>Edit details</strong> on a lecture page changes the title, class code, subject,
        description and tags. The class code is what shows at the top of the screen and groups
        lectures of one class in the library, and tags let you filter it. Renaming a lecture keeps your
        progress.
      </p>
    ),
  },
  {
    id: 'classes',
    title: 'Classes and their exams',
    body: (
      <>
        <p>
          Lectures with the same class code make a class. In the library, tap the class name above them to open
          its page: its lectures in order, its exams, and <strong>Today</strong> for the whole class, which starts
          with the lecture whose exam is nearest and carries on through the others. <strong>Add a lecture</strong>{' '}
          there makes a new one with the class code already set.
        </p>
        <p className="mt-2">
          A class can have several exams, say two midterms and a final. <strong>Add an exam</strong>, give it a
          name and a date, and tick what is on it: whole lectures, or open one and tick its sections. Each lecture
          is planned for the next exam it is on; once a midterm has passed, its lectures move on to the next exam
          that covers them without you doing anything. The exams go with the lectures when you sync, back up or
          share them.
        </p>
      </>
    ),
  },
  {
    id: 'check',
    title: 'The lecture check',
    body: (
      <>
        <p>
          The line under a lecture&rsquo;s title checks the lecture the AI made. It shows how many of
          the terms from your notes got a definition, then what is worth fixing (questions you could
          answer without knowing the material), what only your slides can settle (a figure the AI
          could not read), and, folded away, smaller notes the app already works round.
        </p>
        <p className="mt-2">
          A red cross means something is broken, such as a question that cannot be marked. Tap the
          line for details. <strong>Send these to your AI to fix</strong> gives you a prompt for the
          chat that made the lecture. What comes back fixes those items without replacing your
          lecture or your scores.
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
    title: 'Where your lectures are saved',
    body: (
      <>
        <p>
          Your lectures and progress are saved in this browser, on this device. If you clear the
          browser&rsquo;s data, your lectures go with it.
        </p>
        <p className="mt-2">
          <strong>Sync</strong> (at the foot of every page) is optional: sign in with an email and a
          password on each device you study on, and your lectures and progress follow you between
          them. Without it nothing leaves this device. <strong>Share</strong> on a lecture page makes
          a link anyone can open to add that lecture to their own library; it needs you signed in,
          and opening it does not.
        </p>
        <p className="mt-2">
          <strong>Back up everything</strong> saves every lecture, all your progress and your
          settings as one file. Keep it somewhere safe, or restore it on another device or in the
          installed app to carry on exactly where you left off. Restoring replaces what is on the
          device you restore it on. To give one lecture to a classmate, use <strong>Export</strong>{' '}
          on its lecture page instead. Without sync, the library reminds you when your work has never
          been backed up, or not for a week with new answers since, and warns you before storage is full.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <BackupButton />
          <RestoreButton />
        </div>
        <p className="mt-2">
          Arborous can be installed as an app, and works offline. On an iPhone: Share, then Add to
          Home Screen. On Android or desktop Chrome: the install icon in the address bar, or the ⋮
          menu.
        </p>
        <p className="mt-2">
          On an iPhone the installed app has its own storage, separate from Safari, so lectures added
          in Safari will not appear in it. Back up in Safari and restore in the app.
        </p>
        <p className="mt-2">If you delete a lecture by mistake, tap Undo on the message that appears.</p>
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
      Your lectures are using about {Math.round(usage.used / 1024)} KB of the {Math.round(usage.limit / 1024 / 1024)}{' '}
      MB this browser allows ({pct}%).
      {tight ? ' Export a lecture you have finished and remove it to make room.' : ''}
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
        A test copy is a separate lecture with every item marked as answered right, so its tree is in
        leaf; your real lecture is not touched. Aging a lecture moves its answer times back, so its
        leaves fall; that cannot be undone. A leaf falls once; Fall again lets a lecture's lost leaves
        fall one more time.
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
              <button
                type="button"
                className="press tap-safe"
                onClick={() => {
                  const log = useStudyLogStore.getState().byCourse[id];
                  void navigator.clipboard?.writeText(JSON.stringify(log ?? {}));
                  toast(log ? `Copied ${log.answers.length} answers and ${log.times.length} card times.` : 'Nothing logged yet.', {
                    type: 'success',
                  });
                }}
              >
                Copy study log
              </button>
              <button
                type="button"
                className="press tap-safe"
                onClick={() => {
                  useFallenStore.getState().clear(id);
                  toast(`${c.metadata.title}: lost leaves will fall again.`, { type: 'success' });
                }}
              >
                Fall again
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
