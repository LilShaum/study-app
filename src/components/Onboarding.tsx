import { TREE_THEMES, useThemeStore } from '@/store/theme';
import { useOnboardingStore } from '@/store/onboarding';

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

function isInstalled(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/** First-launch overlay: pick a tree theme, PWA install steps for the detected platform. */
export function Onboarding() {
  const onboarded = useOnboardingStore((s) => s.onboarded);
  const complete = useOnboardingStore((s) => s.complete);
  const tree = useThemeStore((s) => s.tree);
  const setTree = useThemeStore((s) => s.setTree);

  if (onboarded) return null;

  const platform = detectPlatform();
  const installed = isInstalled();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center shadow-md">
        <div className="text-3xl" aria-hidden="true">
          🌳
        </div>
        <h1 className="mt-2 text-xl font-semibold text-text">Welcome to Arborous</h1>
        <p className="mt-1 text-sm text-text-2">Your study companion — grow your knowledge one card at a time.</p>

        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">Choose your tree</div>
          <div className="grid grid-cols-4 gap-2">
            {TREE_THEMES.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setTree(t.value)}
                aria-pressed={tree === t.value}
                className={`rounded border p-2 text-xs transition-colors ${
                  tree === t.value
                    ? 'border-accent bg-accent-light text-accent'
                    : 'border-border text-text-2 hover:border-accent-border'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded border border-border bg-bg p-3 text-left text-sm text-text-2">
          {installed ? (
            <span>✓ You&rsquo;re already using Arborous as an app!</span>
          ) : platform === 'ios' ? (
            <>
              <div className="font-medium text-text">Add to your Home Screen</div>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>Tap the Share button at the bottom of Safari</li>
                <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</li>
                <li>Tap Add in the top-right corner</li>
              </ol>
            </>
          ) : platform === 'android' ? (
            <>
              <div className="font-medium text-text">Add to your Home Screen</div>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>Tap the ⋮ menu in the top-right of Chrome</li>
                <li>Tap &ldquo;Add to Home Screen&rdquo; or &ldquo;Install app&rdquo;</li>
                <li>Tap Add to confirm</li>
              </ol>
            </>
          ) : (
            <>
              <div className="font-medium text-text">Install as a desktop app</div>
              <p className="mt-1">Look for the install icon in the address bar, then click Install.</p>
            </>
          )}
        </div>

        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={complete}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Get started
          </button>
          <button
            type="button"
            onClick={complete}
            className="rounded border border-border px-4 py-2 text-sm text-text-2 hover:text-text"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
