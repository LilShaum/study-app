import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import { cloud, cloudError, syncNow } from '@/lib/cloud';
import { useSyncMetaStore } from '@/store/syncMeta';
import { useProfileStore } from '@/store/profile';
import { useThemeStore, type ThemeMode } from '@/store/theme';
import { toast } from '@/store/toast';
import { RemindersField } from '@/components/RemindersField';
import { BackupButton, RestoreButton } from '@/components/Backup';

/**
 * "#/settings": everything a student sets once and rarely changes, in one
 * place, out of the pages (docs/proposals/settings.md; the owner,
 * 2026-11-25: "we need a settings area for all this kind of shit to live …
 * light mode needs to go there, changing their username goes their,
 * notifications, help, changing your email associated with your account,
 * changing your password, everything like that").
 *
 * Set as the student's page is: ruled sections, each named in small caps.
 * Reached from the foot of every page. Sync lived on a page of its own,
 * which /sync still opens (it comes here).
 */
export function SettingsRoute() {
  // Opened at a section (?s=account, from Share's Sign in).
  const [search] = useSearchParams();
  const opening = search.get('s');
  useEffect(() => {
    if (opening) scrollToAnchor(`settings-${opening}`);
  }, [opening]);
  return (
    <div className="mx-auto max-w-lg">
      <BackLink />
      <h1 className="mt-3 font-display text-display font-semibold text-text">Settings</h1>

      <Section id="settings-you" label="You">
        <NameField />
      </Section>

      <Section id="settings-look" label="Appearance">
        <ThemeChoice />
      </Section>

      <Section id="settings-reminders" label="Reminders">
        <RemindersField />
      </Section>

      <Section id="settings-account" label="Account">
        <AccountSettings />
      </Section>

      <Section id="settings-lectures" label="Your lectures">
        <p className="text-small text-text-2">Everything as one file, to keep or restore.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <BackupButton />
          <RestoreButton />
        </div>
      </Section>

      <Section id="settings-help" label="Help">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/help" className="press tap-safe">
            Help
          </Link>
          <Link to="/help?s=new" className="press tap-safe">
            What&rsquo;s new
          </Link>
        </div>
      </Section>
    </div>
  );
}

/** Back to wherever Settings was opened from; the library if it was opened directly. */
function BackLink() {
  const navigate = useNavigate();
  const fromApp = typeof window !== 'undefined' && (window.history.state?.idx ?? 0) > 0;
  return fromApp ? (
    <button type="button" onClick={() => navigate(-1)} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
      ← Back
    </button>
  ) : (
    <Link to="/" className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
      ← Library
    </Link>
  );
}

function Section({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section className="mt-8 border-t border-border pt-4" aria-labelledby={id}>
      {/* Focusable, so a jump here (Reminders' Sign in, ?s=account) lands the focus too. */}
      <h2 id={id} tabIndex={-1} className="mark mb-3 text-text-3">
        {label}
      </h2>
      {children}
    </section>
  );
}

/** The name the student's page and its link carry: a ruled field, saved when you leave it. */
function NameField() {
  const name = useProfileStore((s) => s.name);
  const setName = useProfileStore((s) => s.setName);
  const [draft, setDraft] = useState(name);
  return (
    <label className="flex max-w-xs items-baseline gap-3">
      <span className="mark shrink-0 text-text-3">Name</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setName(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        maxLength={40}
        autoComplete="given-name"
        placeholder="Your first name"
        className="field min-w-0 flex-1 text-small"
      />
    </label>
  );
}

const THEMES: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
  { mode: null, label: 'Match this device' },
];

/** Light, dark or the device's own, as the app sets every one-of choice. */
function ThemeChoice() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  return (
    <div role="radiogroup" aria-label="Appearance" className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
      {THEMES.map((t) => (
        <button
          key={t.label}
          type="button"
          role="radio"
          aria-checked={mode === t.mode}
          onClick={() => setMode(t.mode)}
          className={`tap-safe text-sm ${
            mode === t.mode ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'text-text-2 hover:text-text'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Signing in, syncing, the account's email and password, signing out.
 *
 * An email and password, not an emailed link or code: a link opens Safari,
 * not the installed app on an iPhone (which keeps its own storage).
 */
function AccountSettings() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState<'email' | 'password' | null>(null);
  const lastSyncAt = useSyncMetaStore((s) => s.lastSyncAt);

  useEffect(() => {
    let live = true;
    void cloud()
      .then(async (sb) => {
        const { data } = await sb.auth.getSession();
        if (live) setEmail(data.session?.user.email ?? null);
      })
      .catch(() => live && setEmail(null));
    return () => {
      live = false;
    };
  }, []);

  const sync = async () => {
    setBusy(true);
    try {
      await syncNow();
      toast('Synced.', { type: 'success' });
    } catch (e) {
      toast(cloudError(e), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await (await cloud()).auth.signOut();
      if (error) throw error;
      setEmail(null);
      setChanging(null);
      toast('Signed out. Your lectures stay on this device.', { type: 'info' });
    } catch (e) {
      toast(cloudError(e), { type: 'error' });
    }
  };

  if (email === undefined) return <p className="text-small text-text-3">Checking…</p>;

  if (!email) {
    return (
      <>
        <p className="text-small text-text-2">Sign in to keep your lectures and progress on every device.</p>
        <SignInForm
          onSignedIn={async (address) => {
            setEmail(address);
            await sync();
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <dl className="border-y border-border py-2">
        <div className="flex items-baseline gap-4 py-1">
          <dt className="w-24 shrink-0 text-micro uppercase tracking-wider text-text-3">Email</dt>
          <dd className="min-w-0 break-words text-small text-text">{email}</dd>
        </div>
        <div className="flex items-baseline gap-4 py-1">
          <dt className="w-24 shrink-0 text-micro uppercase tracking-wider text-text-3">Synced</dt>
          <dd className="text-small text-text-2">
            {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Not yet on this device'}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={sync} disabled={busy} className="press press-ink tap-safe">
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
        <button type="button" onClick={signOut} className="press tap-safe">
          Sign out
        </button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <button
          type="button"
          aria-expanded={changing === 'email'}
          onClick={() => setChanging((c) => (c === 'email' ? null : 'email'))}
          className={`tap-safe text-sm ${changing === 'email' ? 'text-text' : 'text-text-2 hover:text-text'}`}
        >
          Change email
        </button>
        <button
          type="button"
          aria-expanded={changing === 'password'}
          onClick={() => setChanging((c) => (c === 'password' ? null : 'password'))}
          className={`tap-safe text-sm ${changing === 'password' ? 'text-text' : 'text-text-2 hover:text-text'}`}
        >
          Change password
        </button>
      </div>
      {changing && <ChangeForm what={changing} onDone={() => setChanging(null)} />}
    </div>
  );
}

/** A new email or a new password, in place. */
function ChangeForm({ what, onDone }: { what: 'email' | 'password'; onDone: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sb = await cloud();
      const { error: authError } = await sb.auth.updateUser(what === 'email' ? { email: value } : { password: value });
      if (authError) throw authError;
      toast(what === 'email' ? 'Check the new address for a link to confirm it.' : 'Password changed.', {
        type: 'success',
      });
      onDone();
    } catch (err) {
      setError(cloudError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type={what === 'email' ? 'email' : 'password'}
        autoComplete={what === 'email' ? 'email' : 'new-password'}
        required
        minLength={what === 'password' ? 6 : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={what === 'email' ? 'New email' : 'New password, 6 characters or more'}
        aria-label={what === 'email' ? 'New email' : 'New password'}
        autoFocus
        className="field w-full"
      />
      {error && <p className="text-small text-error">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="press press-ink tap-safe">
          {what === 'email' ? 'Save the new email' : 'Save the new password'}
        </button>
        <button type="button" onClick={onDone} className="tap-safe text-sm text-text-3 hover:text-text">
          Cancel
        </button>
      </div>
    </form>
  );
}

function SignInForm({ onSignedIn }: { onSignedIn: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (create: boolean) => async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sb = await cloud();
      const { data, error: authError } = create
        ? await sb.auth.signUp({ email, password })
        : await sb.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (!data.session) throw new Error('Account created, but it needs confirming before you can sign in.');
      await onSignedIn(data.session.user.email ?? email);
    } catch (err) {
      setError(cloudError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit(false)} className="mt-4 space-y-3">
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
        autoComplete="current-password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        aria-label="Password"
        className="field w-full"
      />
      {error && <p className="text-small text-error">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="press press-ink tap-safe">
          Sign in
        </button>
        <button type="button" disabled={busy} onClick={() => void submit(true)()} className="press tap-safe">
          Make an account
        </button>
      </div>
    </form>
  );
}
