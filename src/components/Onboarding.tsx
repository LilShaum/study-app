import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@/store/onboarding';
import { usePlanStore, DAILY_CHOICES } from '@/store/plan';
import { useFallenStore } from '@/store/fallen';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { CourseTree } from './CourseTree';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';
import { Icon, type IconName } from './Icon';

type Platform = 'ios' | 'android' | 'desktop';

/**
 * iPadOS reports a desktop user agent, so touch points are the only reliable
 * tell. Getting this wrong shows "look for the install icon in the address
 * bar" to someone holding an iPad, where there isn't one.
 */
function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipod/i.test(ua)) return 'ios';
  if (/ipad/i.test(ua)) return 'ios';
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

function isInstalled(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  // navigator.standalone is the only signal Safari gives for a Home Screen app.
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
}

/** True inside an iframe, where "open Safari's Share menu" names the wrong app. */
function inFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mark w-4 shrink-0 pt-1 text-text-3">{n}</span>
      <span className="flex-1 pt-0.5">{children}</span>
    </li>
  );
}

/** An inline glyph for a button the reader has to find on their own screen. */
function Glyph({ name }: { name: IconName }) {
  return (
    <span className="mx-0.5 inline-flex h-5 w-5 translate-y-1 items-center justify-center rounded border border-border bg-bg text-text">
      <Icon name={name} size={13} />
    </span>
  );
}


/**
 * The lecture the first run grows: made up, never saved, and about how
 * memory works, so the tree the student plays with is about the very thing
 * the app runs on (docs/evidence.md).
 */
const DEMO_ID = 'arborous:first-run';
const DEMO_PARTS = ['Encoding', 'Forgetting', 'Spacing', 'Retrieval', 'Sleep'];
const DEMO: Course = {
  schema_version: '1.0',
  metadata: { title: 'How memory works' },
  sections: DEMO_PARTS.map((title, s) => ({
    id: `s${s + 1}`,
    title,
    items: Array.from({ length: 6 + ((s * 3) % 4) }, (_, i) => ({
      id: `s${s + 1}-q${i + 1}`,
      type: 'mcq',
      question: '',
      options: ['', '', '', ''],
      answer: 0,
    })),
  })),
} as unknown as Course;

const DAY = 86_400_000;

/** A part studied: every question answered right, last seen `ago` ms before now. */
function studied(sectionId: string, at: number): Record<string, ItemResult> {
  const section = DEMO.sections.find((s) => s.id === sectionId)!;
  return Object.fromEntries(section.items.map((it) => [it.id, { got: 3, missed: 0, lastSeen: at } as ItemResult]));
}

type Page = 'title' | 'install' | 'grow' | 'fade' | 'find' | 'time' | 'safe' | 'start';

/**
 * The first run: something to do, not to read (the owner, 2026-11-24: "really
 * show the user what the app is about and demonstrate what the tree is all
 * about … making them try things/direct their attention or something instead
 * of explaining in bullet points"). docs/proposals/onboarding.md.
 *
 * The tree draws itself on with the name under it (the owner's picture,
 * 2026-11-16). Then the student brings parts of a made-up lecture into leaf
 * with the gesture the lecture page uses (touch the tree, tap a number),
 * lets three weeks pass and watches the parts they left fade, their leaves
 * falling (where "fading" is taught, by being seen), and sweeps across the
 * branches to find a part. Then the daily time, an account or Not now, and
 * the first lecture. A line of words each, at most.
 *
 * Installing comes first on a phone, and that order is not cosmetic: an iOS
 * Home Screen app gets its own storage, so lectures added in Safari are not
 * in the installed app. Skip is always there.
 */
export function Onboarding() {
  const onboarded = useOnboardingStore((s) => s.onboarded);
  if (onboarded) return null;
  return <FirstRun />;
}

function FirstRun() {
  const complete = useOnboardingStore((s) => s.complete);
  const setTotal = usePlanStore((s) => s.setTotal);
  const total = usePlanStore((s) => s.total);
  const navigate = useNavigate();
  const wide = useMediaQuery(WIDE);
  const [platform] = useState(detectPlatform);
  const [installed] = useState(isInstalled);
  const [framed] = useState(inFrame);
  const showInstall = !installed && !framed && platform !== 'desktop';
  const touch = platform !== 'desktop';

  const pages = useMemo<Page[]>(
    () => ['title', ...(showInstall ? (['install'] as Page[]) : []), 'grow', 'fade', 'find', 'time', 'safe', 'start'],
    [showInstall],
  );
  const [at, setAt] = useState(0);
  const page = pages[at];
  const next = () => setAt((n) => Math.min(pages.length - 1, n + 1));
  const back = () => setAt((n) => Math.max(0, n - 1));

  // The made-up lecture's progress, and what the student has done with it.
  const [now] = useState(Date.now);
  const [progress, setProgress] = useState<Record<string, ItemResult>>({});
  const [grown, setGrown] = useState<string[]>([]);
  const [faded, setFaded] = useState(false);
  const [named, setNamed] = useState<string | null>(null);
  const [foundOne, setFoundOne] = useState(false);
  const EMPTY = useMemo(() => ({}), []);

  // A clean slate: no record of leaves already seen falling from an earlier go.
  useEffect(() => {
    const fallen = useFallenStore.getState();
    fallen.clear(DEMO_ID);
    return () => fallen.clear(DEMO_ID);
  }, []);

  const grow = (sid: string) => {
    if (grown.includes(sid)) return;
    setGrown((g) => [...g, sid]);
    setProgress((p) => ({ ...p, ...studied(sid, now) }));
  };
  const letTimePass = () => {
    // Three weeks on: every part studied fades, but the last one, studied
    // again yesterday, keeps its leaves, so the difference is the lesson.
    const kept = grown[grown.length - 1];
    setProgress(
      Object.assign(
        {},
        ...grown.map((sid) => studied(sid, sid === kept ? now - DAY : now - 24 * DAY)),
      ),
    );
    setFaded(true);
  };
  const finish = (to?: string) => {
    complete();
    if (to) navigate(to);
  };

  const partName = (sid: string | null) => {
    const i = DEMO.sections.findIndex((s) => s.id === sid);
    return i < 0 ? null : DEMO.sections[i].title;
  };
  const enough = grown.length >= 2;

  // What each page shows, says and lets the student do.
  let tree: ReactNode = null;
  let body: ReactNode = null;
  let action: ReactNode = (
    <button type="button" onClick={next} className="press press-ink tap-safe">
      Next
    </button>
  );
  const treeClass = wide ? 'h-[30rem] max-w-full' : 'h-[19rem] max-w-full';

  switch (page) {
    case 'title':
      tree = <CourseTree key="title" courseId={DEMO_ID} course={DEMO} progress={EMPTY} crop className={treeClass} arrive />;
      body = (
        <div className="first-run-name text-center wide:text-left">
          <h1 className="font-display text-display font-semibold text-text">Arborous</h1>
          <p className="mt-2 text-body text-text-2">A tree for each lecture you study, that grows as you learn it.</p>
        </div>
      );
      action = (
        <div className="flex flex-col items-center gap-3 wide:items-start">
          <button type="button" onClick={next} className="press press-ink tap-safe">
            Begin
          </button>
          <button type="button" onClick={() => finish('/sync')} className="tap-safe text-small text-text-3 hover:text-text">
            I already use Arborous
          </button>
        </div>
      );
      break;

    case 'install':
      body = (
        <div className="text-small text-text-2">
          <h1 className="font-display text-title font-semibold text-text">Add it to your Home Screen first</h1>
      {platform === 'ios' ? (
        <>
          <p className="mt-1 text-text-3">
            Do this <strong className="text-text-2">before</strong> you add a lecture. An
            installed app gets its own storage on iOS, so lectures you add in Safari first
            won&rsquo;t appear in the installed app.
          </p>
          <ol className="mt-2 space-y-1.5">
            <Step n={1}>
              Tap the Share button
              <Glyph name="share" />
              at the bottom of Safari
            </Step>
            <Step n={2}>
              Scroll down and tap <strong className="text-text">Add to Home Screen</strong>
            </Step>
            <Step n={3}>
              Tap <strong className="text-text">Add</strong>, then open Arborous from your
              Home Screen
            </Step>
          </ol>
        </>
      ) : platform === 'android' ? (
        <>
          <p className="mt-1 text-text-3">
            Worth doing first: it opens full-screen and works offline.
          </p>
          <ol className="mt-2 space-y-1.5">
            <Step n={1}>
              Tap the menu
              <Glyph name="more-vertical" />
              at the top right of Chrome
            </Step>
            <Step n={2}>
              Tap <strong className="text-text">Install app</strong> or{' '}
              <strong className="text-text">Add to Home screen</strong>
            </Step>
            <Step n={3}>
              Confirm, then open Arborous from your home screen
            </Step>
          </ol>
        </>
      ) : (
        <p className="mt-1">
          Look for the install icon in the address bar, or open the browser menu and choose{' '}
          <strong className="text-text">Install</strong>. It then opens in its own window and
          works offline.
        </p>
      )}
        </div>
      );
      action = (
        <button type="button" onClick={next} className="press tap-safe">
          Continue in the browser
        </button>
      );
      break;

    case 'grow':
      tree = (
        <CourseTree
          key="grow"
          courseId={DEMO_ID}
          course={DEMO}
          progress={progress}
          growOnly={EMPTY}
          crop
          className={treeClass}
          interactive
          mode="reveal"
          onOpenSection={grow}
        />
      );
      body = (
        <Words
          lead="Study a part, and it comes into leaf."
          line={
            grown.length === 0
              ? touch
                ? 'Touch the tree, then tap a number.'
                : 'Point at the tree, then click a number.'
              : `${partName(grown[grown.length - 1])} is in leaf. ${enough ? 'One more if you like.' : 'Try another.'}`
          }
        />
      );
      action = (
        <button type="button" onClick={next} disabled={!enough} className="press press-ink tap-safe">
          Next
        </button>
      );
      break;

    case 'fade':
      tree = (
        // Drawn again once time has passed, so it arrives as a lecture does
        // and the leaves lost since fall with a shake.
        <CourseTree key={faded ? 'fade-after' : 'fade-before'} courseId={DEMO_ID} course={DEMO} progress={progress} crop className={treeClass} arrive={faded} />
      );
      body = faded ? (
        <Words
          lead="Leave a part, and it fades."
          line={`Its leaves fall. ${partName(grown[grown.length - 1])}, studied again yesterday, kept them. What is fading comes back first, before you lose it.`}
        />
      ) : (
        <Words lead="Now leave it for a while." line="Most of what you learn slips away unless you come back to it." />
      );
      action = faded ? (
        <button type="button" onClick={next} className="press press-ink tap-safe">
          Next
        </button>
      ) : (
        <button type="button" onClick={letTimePass} className="press press-ink tap-safe">
          Let three weeks pass
        </button>
      );
      break;

    case 'find':
      tree = (
        <CourseTree
          key="find"
          courseId={DEMO_ID}
          course={DEMO}
          progress={progress}
          crop
          className={treeClass}
          interactive
          mode="reveal"
          onPoint={(sid) => {
            setNamed(sid);
            if (sid) setFoundOne(true);
          }}
          onOpenSection={() => undefined}
        />
      );
      body = (
        <Words
          lead="Each branch is a part of the lecture."
          line={
            named
              ? `${partName(named)}. On a lecture, tapping its number opens that part.`
              : touch
                ? 'Run a finger across the branches to find one.'
                : 'Move across the branches to find one.'
          }
        />
      );
      action = (
        <button type="button" onClick={next} disabled={!foundOne} className="press press-ink tap-safe">
          Next
        </button>
      );
      break;

    case 'time':
      body = (
        <div>
          <Words lead="How long on most days?" line="Today fits itself to it. You can change it on the library." />
          <div role="radiogroup" aria-label="Minutes a day" className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-3 wide:justify-start">
            {DAILY_CHOICES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={total === m}
                onClick={() => setTotal(m)}
                className={`tap-safe px-0.5 font-display text-heading tabular-nums ${
                  total === m ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'text-text-2 hover:text-text'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>
      );
      action = (
        <button type="button" onClick={next} className={`press tap-safe ${total != null ? 'press-ink' : ''}`}>
          {total != null ? 'Next' : 'Decide later'}
        </button>
      );
      break;

    case 'safe':
      body = (
        <Words
          lead="Keep your lectures safe."
          line="They live on this device. An account keeps them if it is lost or cleared, and carries them to your other devices."
        />
      );
      action = (
        <div className="flex flex-col items-center gap-3 wide:items-start">
          <button type="button" onClick={() => finish('/sync')} className="press press-ink tap-safe">
            Make an account
          </button>
          <button type="button" onClick={next} className="tap-safe text-small text-text-3 hover:text-text">
            Not now
          </button>
        </div>
      );
      break;

    case 'start':
      body = (
        <Words
          lead="Your first lecture."
          line="New lecture gives you a prompt. Paste it into an AI chat with your slides or notes, and bring back the file it makes."
        />
      );
      action = (
        <div className="flex flex-col items-center gap-3 wide:items-start">
          <button type="button" onClick={() => finish('/?new=1')} className="press press-ink tap-safe">
            New lecture
          </button>
          <button type="button" onClick={() => finish()} className="tap-safe text-small text-text-3 hover:text-text">
            Go to the library
          </button>
        </div>
      );
      break;
  }

  return (
    <div
      className="paper-grain fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Arborous"
    >
      {/* The running head: where you are, and the way out. */}
      <div className="page-block is-wide flex shrink-0 items-baseline justify-between gap-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="mark text-text-3">
          {at > 0 ? (
            <button type="button" onClick={back} className="tap-safe text-text-3 hover:text-text">
              ← Back
            </button>
          ) : (
            '\u00a0'
          )}
        </span>
        <span className="mark tabular-nums text-text-3">
          {at + 1} of {pages.length}
        </span>
        <button type="button" onClick={() => finish()} className="mark tap-safe text-text-3 hover:text-text">
          Skip
        </button>
      </div>

      {/* A page: the tree and its words, one under the other on a phone,
          facing each other on a computer. */}
      {wide ? (
        <div className="page-block is-wide flex flex-1 flex-col justify-center py-6">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,26rem)] items-center gap-16">
            {/* The left page keeps the tree as the student left it, on the
                pages that have only words. */}
            <div className="flex justify-center">
              {tree ?? <CourseTree key="still" courseId={DEMO_ID} course={DEMO} progress={progress} crop className={treeClass} />}
            </div>
            <div className="flex flex-col items-start gap-8" aria-live="polite">
              {body}
              {action}
            </div>
          </div>
        </div>
      ) : (
        // On a phone the page's one action sits at the bottom, under the
        // thumb; the tree and its words take the room above it.
        <>
          <div className="page-block flex flex-1 flex-col items-center justify-center gap-6 py-4 text-center" aria-live="polite">
            {tree && <div className="flex justify-center">{tree}</div>}
            {body}
          </div>
          <div className="page-block flex shrink-0 justify-center pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">{action}</div>
        </>
      )}
    </div>
  );
}

/** A page's words: one line that says what to look at, one that says what to do. */
function Words({ lead, line }: { lead: string; line: string }) {
  return (
    <div>
      <h1 className="font-display text-title font-semibold text-text">{lead}</h1>
      <p className="mt-2 max-w-prose text-body text-text-2">{line}</p>
    </div>
  );
}

