import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@/store/onboarding';
import { usePlanStore, DAILY_CHOICES } from '@/store/plan';
import { useFallenStore } from '@/store/fallen';
import { useProfileStore } from '@/store/profile';
import { cloud, cloudError, syncNow } from '@/lib/cloud';
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


/** The lecture the first run grows: made up and never saved. */
const DEMO_ID = 'arborous:first-run:4';
// Six parts and this id draw the most balanced tree of the ones tried; the
// shape comes from the id and the parts' sizes, not their names. A topic
// every student met at school, so no part name needs explaining (the owner,
// 2026-11-25: "encoding and retrieval … are very confusing").
const DEMO_PARTS = ['Evaporation', 'Condensation', 'Clouds', 'Rain', 'Rivers', 'Groundwater'];
const DEMO: Course = {
  schema_version: '1.0',
  metadata: { title: 'The water cycle' },
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

type Page = 'title' | 'install' | 'grow' | 'fade' | 'find' | 'time' | 'name' | 'account' | 'start';

/** How long a page's words take to leave before the next page's come in. */
const LEAVE_MS = 200;

/**
 * The first run: something to do, not to read (the owner, 2026-11-24: "really
 * show the user what the app is about and demonstrate what the tree is all
 * about … making them try things/direct their attention or something instead
 * of explaining in bullet points"; 2026-11-25: "dynamic and elegant …
 * impressive and intuitive"). docs/proposals/onboarding.md.
 *
 * One tree stays on the page throughout, so it is the same tree the student
 * grows, lets fade and searches; the words change around it, leaving and
 * arriving. The tree draws itself on with the name (the owner's picture,
 * 2026-11-16); the student studies two parts of a made-up lecture with the
 * lecture page's own gesture, skips three weeks ahead and watches the parts
 * they left lose their leaves (where "fading" is taught, by being seen), and
 * sweeps the branches to find one. Then the daily time, their name, an
 * account, and the first lecture. A line of words each.
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
  const setName = useProfileStore((s) => s.setName);
  const navigate = useNavigate();
  const wide = useMediaQuery(WIDE);
  const [platform] = useState(detectPlatform);
  const [installed] = useState(isInstalled);
  const [framed] = useState(inFrame);
  const showInstall = !installed && !framed && platform !== 'desktop';
  const touch = platform !== 'desktop';

  const pages = useMemo<Page[]>(
    () => ['title', ...(showInstall ? (['install'] as Page[]) : []), 'grow', 'fade', 'find', 'time', 'name', 'account', 'start'],
    [showInstall],
  );
  const [at, setAt] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const page = pages[at];
  // The words leave, then the next page's arrive (styles/index.css, fr-words).
  const go = (n: number) => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => {
      setAt(Math.max(0, Math.min(pages.length - 1, n)));
      setLeaving(false);
    }, LEAVE_MS);
  };
  const next = () => go(at + 1);
  const back = () => go(at - 1);

  // The made-up lecture's progress, and what the student has done with it.
  const [now] = useState(Date.now);
  const [progress, setProgress] = useState<Record<string, ItemResult>>({});
  const [grown, setGrown] = useState<string[]>([]);
  const [faded, setFaded] = useState(false);
  const [named, setNamed] = useState<string | null>(null);
  const [foundOne, setFoundOne] = useState(false);
  const [yourName, setYourName] = useState('');
  // Came for their own account, not the tour: sign in, then straight to the library.
  const [returning, setReturning] = useState(false);
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
    // Three weeks on: every part studied fades, but the last one, reviewed
    // yesterday, keeps its leaves, so the difference is the lesson.
    const kept = grown[grown.length - 1];
    setProgress(Object.assign({}, ...grown.map((sid) => studied(sid, sid === kept ? now - DAY : now - 24 * DAY))));
    setFaded(true);
  };
  const finish = (to?: string) => {
    complete();
    if (to) navigate(to);
  };

  const partName = (sid: string | null | undefined) => DEMO.sections.find((s) => s.id === sid)?.title ?? '';
  const first = partName(grown[0]);
  const last = partName(grown[grown.length - 1]);
  const enough = grown.length >= 2;

  // The one tree: grows on the title page, is studied, fades, is searched.
  // Drawn again only once three weeks have passed, so it arrives as a
  // lecture does and the leaves lost since fall.
  const playing = page === 'grow' || page === 'find';
  const big = ['title', 'grow', 'fade', 'find'].includes(page) || wide;
  const tree = page === 'install' ? null : (
    <div
      className="first-run-tree flex justify-center"
      style={{ height: wide ? (big ? '30rem' : '24rem') : big ? '19rem' : '8.5rem' }}
      aria-hidden={!playing}
    >
      <CourseTree
        key={faded ? 'after' : 'before'}
        courseId={DEMO_ID}
        course={DEMO}
        progress={progress}
        crop
        className="h-full max-w-full"
        arrive
        noDim
        growOnly={page === 'grow' ? EMPTY : undefined}
        interactive={playing}
        mode="reveal"
        onOpenSection={page === 'grow' ? grow : () => undefined}
        onPoint={
          page === 'find'
            ? (sid) => {
                setNamed(sid);
                if (sid) setFoundOne(true);
              }
            : undefined
        }
      />
    </div>
  );

  // What each page says and lets the student do.
  let words: ReactNode = null;
  let action: ReactNode = (
    <button type="button" onClick={next} className="press press-ink tap-safe">
      Continue
    </button>
  );

  switch (page) {
    case 'title':
      words = <Words big lead="Arborous" line="Every lecture you study grows into a tree." />;
      action = (
        <div className="flex flex-col items-center gap-3 wide:items-start">
          <button type="button" onClick={next} className="press press-ink tap-safe">
            Begin
          </button>
          <button
            type="button"
            onClick={() => {
              setReturning(true);
              go(pages.indexOf('account'));
            }}
            className="tap-safe text-small text-text-3 hover:text-text"
          >
            I already have an account
          </button>
        </div>
      );
      break;

    case 'install':
      words = (
        <div className="text-small text-text-2">
          <h1 className="font-display text-title font-semibold text-text">Add Arborous to your Home Screen first</h1>

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
      words = (
        <Words
          lead="Study a part, and its branch grows leaves."
          line={
            grown.length === 0
              ? touch
                ? 'Here is a sample lecture on the water cycle. Touch the tree, then tap a number to study a part.'
                : 'Here is a sample lecture on the water cycle. Point at the tree, then click a number to study a part.'
              : grown.length === 1
                ? `${first} has grown its leaves. Now study one more.`
                : `${first} and ${last} have grown their leaves.`
          }
        />
      );
      action = (
        <button type="button" onClick={next} disabled={!enough} className="press press-ink tap-safe">
          Continue
        </button>
      );
      break;

    case 'fade':
      words = faded ? (
        <Words
          lead="What you don't review starts to fade."
          line={`${first} went unreviewed, so its leaves fell. ${last}, reviewed yesterday, kept them. Arborous brings fading parts back before you forget them.`}
        />
      ) : (
        <Words lead="Now leave it for a while." line="Without review, what you learn begins to slip away." />
      );
      action = faded ? (
        <button type="button" onClick={next} className="press press-ink tap-safe">
          Continue
        </button>
      ) : (
        <button type="button" onClick={letTimePass} className="press press-ink tap-safe">
          Skip ahead three weeks
        </button>
      );
      break;

    case 'find':
      words = (
        <Words
          lead="Sweep across the tree to find any part."
          line={
            named
              ? `That's ${partName(named)}. On a lecture, ${touch ? 'tap' : 'click'} its number to open it.`
              : touch
                ? 'Slide a finger along the branches.'
                : 'Move your pointer along the branches.'
          }
        />
      );
      action = (
        <button type="button" onClick={next} disabled={!foundOne} className="press press-ink tap-safe">
          Continue
        </button>
      );
      break;

    case 'time':
      words = (
        <div>
          <Words lead="How long can you study on most days?" line="Each day's session will fit that time. You can change it whenever you like." />
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
          {total != null ? 'Continue' : 'Not sure yet'}
        </button>
      );
      break;

    case 'name':
      words = (
        <div className="w-full max-w-sm">
          <Words lead="What should we call you?" />
          <input
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && yourName.trim()) {
                setName(yourName);
                next();
              }
            }}
            placeholder="Your first name"
            aria-label="Your name"
            autoComplete="given-name"
            className="field mt-5 w-full text-center wide:text-left"
          />
        </div>
      );
      action = (
        <div className="flex flex-col items-center gap-3 wide:items-start">
          <button
            type="button"
            onClick={() => {
              if (yourName.trim()) setName(yourName);
              next();
            }}
            className={`press tap-safe ${yourName.trim() ? 'press-ink' : ''}`}
          >
            {yourName.trim() ? 'Continue' : 'Skip'}
          </button>
        </div>
      );
      break;

    case 'account':
      words = (
        <AccountStep signingIn={returning} onDone={() => (returning ? finish() : next())} onSkip={next} />
      );
      action = null;
      break;

    case 'start':
      words = (
        <Words
          lead="Now make your first lecture."
          line="Arborous gives you a prompt. Paste it into an AI chat with your slides or notes, then bring back the file it makes."
        />
      );
      action = (
        <div className="flex flex-col items-center gap-3 wide:items-start">
          <button type="button" onClick={() => finish('/?new=1')} className="press press-ink tap-safe">
            Make a lecture
          </button>
          <button type="button" onClick={() => finish()} className="tap-safe text-small text-text-3 hover:text-text">
            Go to the library
          </button>
        </div>
      );
      break;
  }

  const pageKey = page + (faded ? ':after' : '') + (grown.length > 1 ? ':2' : grown.length);
  const motion = `fr-words ${page === 'title' ? 'fr-title' : ''} ${leaving ? 'fr-leaving' : ''}`;
  const wordsBlock = (
    <div key={pageKey} className={`${motion} flex flex-col gap-8 ${wide ? 'items-start' : 'items-center text-center'}`} aria-live="polite">
      {words}
      {wide && action}
    </div>
  );
  // On a phone the page's one action waits at the bottom, under the thumb.
  const actionBlock = !wide && action && (
    <div key={`${pageKey}:act`} className={`${motion} fr-action flex justify-center text-center`}>
      {action}
    </div>
  );

  return (
    <div className="paper-grain fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg" role="dialog" aria-modal="true" aria-label="Welcome to Arborous">
      {/* The running head: where you are, and the way out. */}
      <div className="page-block is-wide flex shrink-0 items-baseline justify-between gap-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="mark text-text-3">
          {at > 0 ? (
            <button type="button" onClick={back} className="tap-safe text-text-3 hover:text-text">
              ← Back
            </button>
          ) : (
            ' '
          )}
        </span>
        <span className="mark tabular-nums text-text-3">
          {at + 1} of {pages.length}
        </span>
        <button type="button" onClick={() => finish()} className="mark tap-safe text-text-3 hover:text-text">
          Skip
        </button>
      </div>

      {wide ? (
        <div className="page-block is-wide flex flex-1 flex-col justify-center py-6">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,26rem)] items-center gap-16">
            {tree ?? <div aria-hidden="true" />}
            {wordsBlock}
          </div>
        </div>
      ) : (
        // On a phone the tree and its words take the room above, and the
        // page's one action sits at the bottom, under the thumb.
        <>
          <div className="page-block flex flex-1 flex-col items-center justify-center gap-6 py-4">
            {tree}
            {wordsBlock}
          </div>
          <div className="page-block shrink-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">{actionBlock}</div>
        </>
      )}
    </div>
  );
}

/** A page's words: the one thing to see, and the one thing to do. */
function Words({ lead, line, big = false }: { lead: string; line?: string; big?: boolean }) {
  return (
    <div>
      <h1 className={`font-display font-semibold text-text ${big ? 'text-display' : 'text-title'}`}>{lead}</h1>
      {line && <p className="mt-2 max-w-prose text-body text-text-2">{line}</p>}
    </div>
  );
}

/**
 * An account in the first run: email and password, made or signed in to
 * here, so the lectures to come are kept and synced from the start (the
 * owner, 2026-11-25). Not now carries on; so does an account that needs its
 * email confirmed first.
 */
function AccountStep({ signingIn, onDone, onSkip }: { signingIn: boolean; onDone: () => void; onSkip: () => void }) {
  const [have, setHave] = useState(signingIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sb = await cloud();
      const { data, error: authError } = have
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
      if (authError) throw authError;
      if (!data.session) {
        setError('Check your email to confirm the account, then sign in on your page.');
        return;
      }
      await syncNow().catch(() => undefined);
      onDone();
    } catch (err) {
      setError(cloudError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4">
      <Words
        lead={have ? 'Welcome back.' : 'Keep your progress on every device.'}
        line={
          have
            ? 'Sign in and your lectures and progress come back.'
            : 'An account syncs your lectures and progress, and keeps them safe if you lose this device.'
        }
      />
      <input
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        aria-label="Email"
        className="field w-full"
      />
      <input
        type="password"
        autoComplete={have ? 'current-password' : 'new-password'}
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={have ? 'Password' : 'A password, 6 characters or more'}
        aria-label="Password"
        className="field w-full"
      />
      {error && <p className="text-small text-error">{error}</p>}
      <div className="mt-2 flex flex-col items-center gap-3 wide:items-start">
        <button type="submit" disabled={busy} className="press press-ink tap-safe">
          {have ? 'Sign in' : 'Make my account'}
        </button>
        <button type="button" onClick={() => setHave((h) => !h)} className="tap-safe text-small text-text-3 hover:text-text">
          {have ? 'I need an account' : 'I already have an account'}
        </button>
        <button type="button" onClick={onSkip} className="tap-safe text-small text-text-3 hover:text-text">
          Not now
        </button>
      </div>
    </form>
  );
}
