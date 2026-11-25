import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BLOCK_LINE, pushBlock, saveReminderPlan, turnOffReminders, turnOnReminders } from '@/lib/push';
import { cloudError } from '@/lib/cloud';
import { useRemindersStore, type ReminderSettings } from '@/store/reminders';

const KINDS: { key: 'daily' | 'secondLook' | 'exam'; label: string }[] = [
  { key: 'daily', label: 'Each day, when there is something to study' },
  { key: 'secondLook', label: 'A second look at what I missed, a few hours on' },
  { key: 'exam', label: 'Three days and one day before an exam' },
];

/**
 * Reminders on the student's page (docs/proposals/notifications.md): on or
 * off for this device, the time of day, and which kinds. Where push can't
 * work, one line says what would make it work.
 */
export function RemindersField() {
  const r = useRemindersStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const block = pushBlock();

  const change = (patch: Partial<ReminderSettings>) => {
    r.set(patch);
    saveReminderPlan(true).catch((e) => setError(cloudError(e)));
  };

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      await turnOnReminders();
    } catch (e) {
      setError(cloudError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!r.on) {
    return (
      <div className="mt-2">
        {block && block !== 'denied' ? (
          <p className="text-small text-text-2">
            {BLOCK_LINE[block]}
            {block === 'signin' && (
              <>
                {' '}
                <Link to="/sync" className="underline decoration-border underline-offset-2 hover:decoration-text">
                  Sign in
                </Link>
              </>
            )}
          </p>
        ) : (
          <>
            <p className="text-small text-text-2">When something starts to fade, or an exam is near. Never more than two a day.</p>
            <button type="button" onClick={turnOn} disabled={busy} className="press tap-safe mt-3">
              {busy ? 'Turning on…' : 'Turn on reminders'}
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="mt-2 text-small text-error">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <fieldset>
        <legend className="sr-only">Remind me</legend>
        <ul className="border-t border-border">
          {KINDS.map((k) => (
            <li key={k.key} className="border-b border-border">
              <label className="tap-safe flex cursor-pointer items-center gap-3 py-2 text-small text-text">
                <input type="checkbox" checked={r[k.key]} onChange={(e) => change({ [k.key]: e.target.checked })} className="accent-accent" />
                {k.label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <label className="mt-3 flex items-baseline gap-3">
        <span className="mark shrink-0 text-text-3">At</span>
        <input
          type="time"
          value={r.time}
          onChange={(e) => e.target.value && change({ time: e.target.value })}
          className="field w-28 text-small tabular-nums"
        />
      </label>
      <button
        type="button"
        onClick={() => {
          setError(null);
          void turnOffReminders();
        }}
        className="tap-safe mt-4 text-small text-text-2 underline decoration-border underline-offset-2 hover:text-text"
      >
        Turn off on this device
      </button>
      {error && (
        <p role="alert" className="mt-2 text-small text-error">
          {error}
        </p>
      )}
    </div>
  );
}
