import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { scoredEntries } from '@/lib/scored';
import { useCoursesStore } from '@/store/courses';
import { agedProgress, studiedProgress, useProgressStore } from '@/store/progress';
import { useFallenStore } from '@/store/fallen';
import { useStudyLogStore } from '@/store/studyLog';
import { toast } from '@/store/toast';
import { Icon } from '@/components/Icon';
import { BackupButton, RestoreButton } from '@/components/Backup';
import { ShareApp } from '@/components/ShareApp';
import { WhatsNew } from '@/components/WhatsNew';
import { useOnboardingStore } from '@/store/onboarding';
import { storageUsage } from '@/lib/safeStorage';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import { VERSION } from '@/lib/appUpdate';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';

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
    what: 'The one to press most days. It reviews what you are starting to forget, then carries on with new material, and ends when your daily time is up. Set the time, and your exam date and what it covers, from the line under Today on the lecture page. If one exam covers several lectures with the same class code, you can set it on all of them at once there. In the last few days before an exam it makes more room for anything on it you have not studied yet, and in the last three it splits your daily time into three sittings a few hours apart, which does more than one long one. Once your time is used up, coming back a few hours later gives a five-minute catch-up on what you missed, which does more for those cards than going over them again straight away. With more than one lecture, you can set one daily time for all of them under Today on the library page: it is shared by how soon each exam is, so the nearest gets the most. Today on the library page suggests what to study: a class with an exam close, what is fading, where Learn left off, a lecture not started, each one tap away.',
    scored: true,
  },
  {
    name: 'Adaptive quiz',
    what: 'Questions keep coming for as long as you want, ten planned at a time from where you are: what is fading or you got wrong before first, then questions you have not answered yet from parts you have already studied, in no fixed order, easier before harder. For a lecture you have not studied, use Learn first. A question you miss comes back a few questions later. When everything to review is done, it says so: carry on, or stop. On a class page it draws from every lecture of the class.',
    scored: true,
  },
  {
    name: 'Learn',
    what: 'Teaches a section a few terms at a time, about a dozen cards a step. Each step goes Read, Recall, Apply: read the terms; recall them, easy first (an easy multiple choice, the flashcards, then each term named from its meaning); then apply them in the harder multiple choice, with any answer to write last. Where nothing easy comes first, a term is named after the questions, never straight after reading it. Two cards on the same fact are never close together: the second waits for a later step, so you answer it from what you know and not from the card before. A term whose definition spells out its own name is read but not asked; the lecture check lists those, and Fix rewords them. A term gets at most three cards the first time you meet it; the rest, and any card that would come too soon after its twin, open your next sitting as a second look. A term defined the same way in two of your lectures counts once: answer it in one and the other knows. Where a section turns on how or why something works, a short explanation (The idea) comes before the questions on it: what the idea is, why, and how it follows from the one before. Anything you get wrong comes back a few cards later in the same step, with the passage from your notes. After each step you can stop, and Learn picks up at the next one. At the end it offers the next section. Each section starts by asking: Read it here first, or Questions first. Questions first suits a part you have just read in your notes or heard in class: nothing is explained before it is asked, and the why and the passage open when you miss one or are not sure. Trying first helps even when you get it wrong. The step line has the other choice, to change it partway.',
    scored: true,
  },
  {
    name: 'Practice',
    what: 'Study whatever you want, however you want, outside the plan: before a class quiz, on a part that feels shaky, only problems, only flashcards on a bus. Each answer is marked as you give it. On top are ready-made sittings, one tap each: To review (what is fading, weakest first), Mistakes, Flashcards (the ones fading first, then up to ten new, as Anki does) and Problems. Below, Choose it yourself: tick the kinds of card (multiple choice, flashcards, written answers, terms, problems), tick which cards (to review, mistakes, new, already strong), pick an order (Mixed, the way an exam mixes them; In order, as the lectures teach them; Weakest first), and under From tick the sections, or on a class page the lectures and their sections. Start, pinned at the bottom, says how many cards you get. Written answers are left unticked until you tick them. Studies keeps only the cards on empirical studies, or one study. To go straight to one kind, use the links under Practice on the lecture page, or on a section’s page for that section. Mistakes keeps a card you got wrong until you get it right on a later day: right again a minute after the miss is the answer you just saw. On a class page, Mixed puts every lecture in one sitting, so you have to tell apart ideas from different lectures, as an exam does; In order runs one lecture after another. In the last week before one of the class’s exams, Mixed is the default. Each answer counts in its own lecture. Your choices are remembered for next time. Today still decides what comes back when, so a card that is not fading yet gains little from more practice.',
    scored: true,
  },
  {
    name: 'Practice test',
    what: 'A rehearsal for the exam: nothing is marked until it ends, as in an exam. On the Practice page, and on a class page for one exam or the whole class. Only the medium and hard questions, the ones that ask you to use what you know. Under On it, multiple choice is ticked; tick Problems or Written answers to add those. Under From, tick the sections, or a class’s lectures. A test of 20 or 40 over several lectures takes from each by its size, or the same from each if you choose Each the same. Timer: None, or Timed, with minutes suggested from what is on it (about a minute and a quarter a question, 3 a problem, 5 a written answer); when time is up the test ends and is marked. You can go back and change an answer until you end it. Tap the question count to see every question by number and turn to any of them, as the pages of a paper test; Mark to come back to puts a ? beside one. If any are blank or marked when you end, you see which first. At the end: your score, each section weakest first, and every question you missed with why, the right answer and the passage from your notes; written answers are ticked point by point first. Each new test asks first what you last got wrong or didn’t know, then the questions you have not had on a test yet, then those you had longest ago. Retake the missed ones as often as you like. A test in progress, and its time, are kept if you leave or the app reloads. Your answers count as practice, so Today knows what the test found. Want each answer marked as you give it? That is Practice.',
    scored: true,
  },
  {
    name: 'Browse',
    what: 'The whole lecture to read through. You can edit, delete or add items here.',
    scored: false,
  },
  {
    name: 'Glossary',
    what: 'Every term in the lecture, with its meaning, to look things up. Find it under View on the lecture page.',
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
  { keys: '1 – 6', what: 'Tick a statement, in Select all that apply' },
  { keys: 'Enter', what: 'Check your answer (it never moves on, so a second press cannot skip the feedback)' },
  { keys: '→ / ←', what: 'Next or previous item' },
  { keys: 'Space', what: 'Flip a flashcard' },
  { keys: 'G / H / M', what: 'Mark a flashcard got it, hard (right, but it took effort: it comes back sooner) or missed it' },
  { keys: '1 – 9', what: 'Tick a point of a written answer; Enter when done' },
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
            On the library page, tap <strong>New lecture</strong>. Under <strong>What to make</strong>, leave <strong>What suits my
            material</strong> and the AI picks the kind of card that fits each idea, or choose <strong>Only the kinds I
            tick</strong>: only flashcards, say, gets you only flashcards, and the lecture keeps that choice for
            everything added later. Tick <strong>My exams ask about the studies in my
            material</strong> only if they do: each study is then taught in full, which uses a lot more of the
            AI&rsquo;s usage. Tick <strong>Explain more than my slides do</strong> for more explanation and context
            where the slides are thin, such as a lecture you missed: a longer file.
          </li>
          <li>
            Copy the prompt and paste it into the strongest AI you can use, on its highest effort
            setting (a quick model makes a weaker lecture). Attach your slides
            or notes to that same message. Files kept only in a project often reach the AI as text,
            without the diagrams, and the lecture then misses what the diagrams show. If a key
            diagram is dense, attach a screenshot of that slide too.
          </li>
          <li>
            The AI hands back a <span className="font-mono">.study.json</span> file. Upload it in
            New lecture.
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
          Opening a lecture, its tree grows and the leaves you have let fade fall, with a shake.
          Sweep a finger across it (or point, on a computer) to name a part, and tap its number to
          open that part. In a sitting the tree grows a leaf when a part is learned, and never drops
          one for a wrong answer: leaves fall only from not practising.
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
          A flashcard you mark yourself: <strong>Got it</strong>, <strong>Hard</strong> or <strong>Missed it</strong>.
          Hard is right, but only just, or after a long think: it comes back sooner than Got it. Under each is when the
          card would come back. Be strict with Got it: a near miss called Got it waits too long and fades.
        </p>
        <p className="mt-2">
          <strong>Select all that apply</strong>: tick every statement that is true, then Check answer. It never
          says how many are true. It counts as got only with every true one ticked and no false one; each
          statement is then marked with why it is true or false, and how many of them you judged right.
        </p>
        <p className="mt-2">
          After a multiple-choice answer, <strong>Why</strong> is the idea the question rests on, from the
          lecture&rsquo;s explanations: open when you got it wrong, a tap away when you got it right. Not
          sure of your pick? Tap <strong>Not sure</strong> before Check answer: if it was right, the why
          and the passage open anyway, so a lucky guess still teaches. In a practice test, a question
          you leave marked ? counts as not sure.
        </p>
        <p className="mt-2">
          Don&rsquo;t know it? Tap <strong>I don&rsquo;t know</strong> rather than guess: you see the answer and the passage
          from your notes, and it counts as a miss, so it comes back sooner. A lucky guess would have counted as known.
        </p>
        <p className="mt-2">
          A short- or long-answer question, the kind an exam has you write, is asked as one: write your answer (or
          answer in your head), then tick each point of the model answer you made. It counts as got it only with every
          point, as full marks would.
        </p>
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
            <strong>Add questions</strong> is for more questions on the notes you already have. It
            does not need the notes again.
          </li>
          <li>
            <strong>Add explanations</strong> is for a lecture made before explanations existed. It
            asks for a short explanation of each key idea, the connections your teacher makes in
            class, which Learn shows just before the questions on it. Paste it into the chat that
            wrote the lecture, so it writes from your notes.
          </li>
          <li>
            <strong>Send these to your AI to fix</strong>, in the lecture check, asks the AI to fix
            what the check found.
          </li>
          <li>
            <strong>Even out the answers</strong>, in the lecture check when the right answer is
            too often the longest option, asks only for new wrong answers to those questions: a
            short prompt and a short reply. A class page offers the same for all its lectures at
            once. Each question carries the passage from your notes it came from, so any chat can
            answer it.
          </li>
        </ul>
        <p className="mt-2">
          Each time, you upload the file the AI hands back and see what will change before
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
          <strong>Sync</strong> (on your page, at the foot of every page under your name or Account) is optional: sign in with an email and a
          password on each device you study on, and your lectures and progress follow you between
          them. Without it nothing leaves this device. <strong>Share</strong> on a lecture page makes
          a link anyone can open to add that lecture to their own library; it needs you signed in,
          and opening it does not.
        </p>
        <p className="mt-2">
          <strong>Back up everything</strong> saves every lecture, all your progress and your
          settings as one file. Keep it somewhere safe, or restore it on another device or in the
          installed app to carry on exactly where you left off. Restoring replaces what is on the
          device you restore it on: it shows the backup beside what the device has first, and can be
          undone straight after. To give one lecture to a classmate, use <strong>Export</strong>{' '}
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
  {
    id: 'new',
    title: 'What’s new',
    body: <WhatsNew />,
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
      Show the welcome again
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

/**
 * "/help" — what the app does, including the parts that aren't obvious.
 *
 * A phone gets the sections folded to one line each, so a topic is found
 * without scrolling past the rest; a computer gets the contents at the side,
 * the current topic underscored, and the text at reading width.
 */
export function HelpRoute() {
  const [search] = useSearchParams();
  const wide = useMediaQuery(WIDE);
  // Phone: which sections are unfolded.
  const [unfolded, setUnfolded] = useState<ReadonlySet<string>>(new Set());
  // Computer: the section nearest the top of the page.
  const [current, setCurrent] = useState<string>(SECTIONS[0]!.id);

  useEffect(() => {
    if (!wide || typeof IntersectionObserver === 'undefined') return;
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target.id);
          else seen.delete(e.target.id);
        }
        // The first section in the book that is in the top part of the screen.
        const first = SECTIONS.find((x) => seen.has(x.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: '0px 0px -65% 0px' },
    );
    for (const x of SECTIONS) {
      const el = document.getElementById(x.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [wide]);

  // A jump into a folded section unfolds it first.
  const jump = (id: string) => {
    if (!wide) setUnfolded((u) => new Set(u).add(id));
    scrollToAnchor(id);
  };
  const toggle = (id: string) =>
    setUnfolded((u) => {
      const next = new Set(u);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const contents = (
    <nav aria-label="Help topics">
      <h2 className="mark mb-2 text-text-3">Contents</h2>
      <ol className="border-t border-border">
        {SECTIONS.map((s, i) => (
          <li key={s.id} className="border-b border-border">
            <button
              type="button"
              onClick={() => jump(s.id)}
              aria-current={wide && current === s.id ? 'true' : undefined}
              className="group tap-safe flex w-full items-baseline gap-3 py-2 text-left"
            >
              <span className="mark w-5 shrink-0 tabular-nums text-text-3">{i + 1}</span>
              <span
                className={`${wide ? 'text-small' : 'text-body'} ${
                  wide && current === s.id
                    ? 'text-accent underline decoration-accent decoration-2 underline-offset-4'
                    : 'text-text group-hover:text-accent'
                }`}
              >
                {s.title}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );

  const sections = SECTIONS.map((s) => {
    const open = wide || unfolded.has(s.id);
    return (
      <section key={s.id} id={s.id} tabIndex={-1} className={`prose-set scroll-mt-20 border-t border-border ${wide ? 'pt-6' : open ? 'pb-4' : ''}`}>
        {wide ? (
          <h2 className="mb-2 font-display text-heading font-semibold text-text">{s.title}</h2>
        ) : (
          // Folded: the heading is the one line; a tap unfolds the section.
          <button
            type="button"
            aria-expanded={open}
            onClick={() => toggle(s.id)}
            className="tap-safe flex w-full items-baseline justify-between gap-3 text-left"
          >
            <h2 className="font-display text-heading font-semibold text-text">{s.title}</h2>
            <span className="mark shrink-0 text-text-3" aria-hidden="true">
              {open ? '▾' : '▸'}
            </span>
          </button>
        )}
        <div className={`space-y-1 text-small text-text-2 ${open ? '' : 'hidden'}`}>{s.body}</div>
      </section>
    );
  });

  const intro = (
    <div className="mt-4 space-y-2">
      <ReplayWelcome />
      <ShareApp />
    </div>
  );

  return (
    <div>
      <Link to="/" className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← Library
      </Link>
      <h1 className="mt-3 font-display text-display font-semibold text-text">Help</h1>
      {/* Which copy is running, to check against the live one. */}
      <p className="mt-1 text-small text-text-3">
        Version {VERSION} ·{' '}
        <button
          type="button"
          onClick={() => jump('new')}
          className="text-text-3 underline decoration-border underline-offset-2 hover:text-text"
        >
          What’s new
        </button>
      </p>
      {search.has('devtools') && <TestingTools />}

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
      {wide ? (
        <div className="mt-6 grid grid-cols-[13rem_minmax(0,1fr)] gap-x-12">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] self-start overflow-y-auto [scrollbar-width:thin]">
            {contents}
          </div>
          <div className="max-w-[40rem]">
            <div className="-mt-4">{intro}</div>
            <div className="mt-8 space-y-8">{sections}</div>
          </div>
        </div>
      ) : (
        <>
          {intro}
          {/* The folded headings are the contents: one line each. */}
          <div className="mt-6 border-b border-border">{sections}</div>
        </>
      )}
    </div>
  );
}
