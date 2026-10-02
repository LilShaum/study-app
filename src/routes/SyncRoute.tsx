import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { cloud, cloudError, syncNow } from '@/lib/cloud';
import { useSyncMetaStore } from '@/store/syncMeta';
import { toast } from '@/store/toast';

/**
 * Sign in, and keep this device and your others the same.
 *
 * An email and password, not an emailed link or code: a link opens Safari,
 * not the installed app on an iPhone (which keeps its own storage), and the
 * free email service sends codes only to the project owner.
 */
export function SyncRoute() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const lastSyncAt = useSyncMetaStore((s) => s.lastSyncAt);

  useEffect(() => {
    let live = true;
    void cloud().then(async (sb) => {
      const { data } = await sb.auth.getSession();
      if (live) setEmail(data.session?.user.email ?? null);
    });
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
    await (await cloud()).auth.signOut();
    setEmail(null);
    toast('Signed out. Your courses stay on this device.', { type: 'info' });
  };

  return (
    <div className="mx-auto max-w-lg">
      <Link to="/" className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← Library
      </Link>
      <h1 className="mt-3 font-display text-display text-text">Sync</h1>
      <p className="mt-2 text-small text-text-2">
        Sign in on each device you study on, and your courses and progress follow you between them. Without an account,
        everything stays on this device, as before.
      </p>

      {email === undefined ? (
        <p className="mt-8 text-small text-text-3">Checking…</p>
      ) : email ? (
        <div className="mt-8 space-y-4 border-y border-border py-5">
          <p className="text-small text-text-2">
            Signed in as <span className="text-text">{email}</span>.
          </p>
          <p className="text-small text-text-3">
            {lastSyncAt ? `Last synced ${new Date(lastSyncAt).toLocaleString()}.` : 'Not synced yet on this device.'} It
            also syncs when you open the app and when you leave it.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={sync} disabled={busy} className="press press-ink tap-safe">
              {busy ? 'Syncing…' : 'Sync now'}
            </button>
            <button type="button" onClick={signOut} className="press tap-safe">
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <SignInForm
          onSignedIn={async (address) => {
            setEmail(address);
            await sync();
          }}
        />
      )}
    </div>
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
    <form onSubmit={submit(false)} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field w-full"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field w-full"
        />
      </label>
      {error && <p className="text-small text-error">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="press press-ink tap-safe">
          Sign in
        </button>
        <button type="button" disabled={busy} onClick={() => void submit(true)()} className="press tap-safe">
          Create account
        </button>
      </div>
      <p className="text-xs text-text-3">
        The first time you sign in on a device, what is on it is combined with what is in your account, so nothing on
        either is lost.
      </p>
    </form>
  );
}
