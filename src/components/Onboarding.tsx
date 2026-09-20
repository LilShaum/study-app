import { useState } from 'react';
import { useOnboardingStore } from '@/store/onboarding';
import { Sprig } from '@/components/Sprig';
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
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
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
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[11px] font-semibold text-text-2">
        {n}
      </span>
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
 * First-launch welcome.
 *
 * Installation comes before anything else on a phone, and that ordering is not
 * cosmetic: an iOS Home Screen app gets its own storage container, and every
 * course a student holds lives in `localStorage`. Set up in Safari, install
 * afterwards, and you open an app with none of your courses in it and no
 * explanation — the courses are still in Safari, but invisible from the icon
 * you were just told to make. So the install step leads, and says why.
 *
 * Shown only where it is true: not when already installed, not in a frame
 * (where the instructions name a browser the reader isn't looking at), and
 * never as a dead end — "Skip" is always there.
 */
export function Onboarding() {
  const onboarded = useOnboardingStore((s) => s.onboarded);
  const complete = useOnboardingStore((s) => s.complete);
  const [platform] = useState(detectPlatform);
  const [installed] = useState(isInstalled);
  const [framed] = useState(inFrame);

  if (onboarded) return null;

  const showInstall = !installed && !framed;
  const phone = platform === 'ios' || platform === 'android';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-6 w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-md">
        <div className="flex justify-center text-accent">
          <Sprig className="h-10" />
        </div>
        <h1 className="mt-2 text-center text-xl font-semibold text-text">Welcome to Arborous</h1>
        <p className="mt-1 text-center text-sm text-text-2">
          Turn your lecture notes into a course, then study it. The app gives you the prompt.
        </p>

        {showInstall && (
          <div className="mt-5 rounded border border-border bg-bg p-3 text-left text-sm text-text-2">
            <div className="font-medium text-text">
              {phone ? 'Add it to your Home Screen first' : 'Install it as an app'}
            </div>

            {platform === 'ios' ? (
              <>
                <p className="mt-1 text-text-3">
                  Do this <strong className="text-text-2">before</strong> you add a course. An
                  installed app gets its own storage on iOS, so courses you add in Safari first
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
                  Worth doing first — it opens full-screen and works offline.
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
        )}

        {installed && (
          <div className="mt-5 rounded border border-border bg-bg p-3 text-sm text-text-2">
            ✓ You&rsquo;re using Arborous as an installed app — it works offline from here.
          </div>
        )}

        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={complete}
            className="tap-safe rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Get started
          </button>
          {showInstall && phone && (
            <button
              type="button"
              onClick={complete}
              className="tap-safe rounded border border-border px-4 py-2 text-sm text-text-2 hover:text-text"
            >
              Continue in the browser
            </button>
          )}
          {!(showInstall && phone) && (
            <button
              type="button"
              onClick={complete}
              className="tap-safe rounded border border-border px-4 py-2 text-sm text-text-2 hover:text-text"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
