import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { backUpNow, holdingsHere, holdingsOf, keepForUndo, nothingHere, readBackup, restoreAndTell, restoreUndoable, type Backup } from '@/lib/backup';
import { countAnswers, readBackedUp, writeBackedUp } from '@/lib/keepSafe';
import { useDialog } from '@/lib/useDialog';
import { toast } from '@/store/toast';
import { Icon } from './Icon';

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
const dated = (at: number) =>
  new Date(at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const madeAt = (backup: Backup) => (Date.parse(backup.createdAt) ? dated(Date.parse(backup.createdAt)) : 'an unknown date');

/** Saves every course, all progress and settings as one file. */
export function BackupButton({
  className = 'press tap-safe',
  label = 'Back up everything',
  onSaved,
}: {
  className?: string;
  label?: string;
  /** Once the file has gone somewhere. */
  onSaved?: () => void;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (await backUpNow()) onSaved?.();
      }}
    >
      {label}
    </button>
  );
}

/**
 * Replaces what this device has saved with a backup file. Where the device
 * holds anything, the app's own sheet first shows the file beside the
 * device, and what restoring would lose; after the reload a toast says what
 * was restored, with Undo. Reloads so every part of the app starts from what
 * was restored.
 */
export function RestoreButton({ className = 'press tap-safe', label = 'Restore from a backup' }: { className?: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Backup | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const read = readBackup(await file.text());
    if (!read.ok) {
      toast(read.error, { type: 'error' });
      return;
    }
    // A new device has nothing to lose, so nothing to ask.
    if (nothingHere()) restore(read.backup, false);
    else setPicked(read.backup);
  };

  return (
    <>
      <button type="button" className={className} onClick={() => input.current?.click()}>
        {label}
      </button>
      <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
      {/* On the body: the button can sit inside a sentence, where a dialog cannot. */}
      {picked && createPortal(<RestoreDialog backup={picked} onClose={() => setPicked(null)} />, document.body)}
    </>
  );
}

/** Restores and reloads; false, with nothing changed, when the browser would not take it. */
function restore(backup: Backup, undo: boolean): boolean {
  const n = Object.keys(holdingsOf(backup).lectures).length;
  if (!restoreAndTell(backup, `Restored the backup from ${madeAt(backup)}: ${plural(n, 'lecture')}.`, undo)) {
    toast("This browser's storage is full or blocked, so the backup couldn't be restored. Nothing was changed.", { type: 'error' });
    return false;
  }
  // A restore is a backup as of when that file was made: the student holds
  // it. Every answer counted, as backUpNow counts them for the reminder.
  let answers = 0;
  let lectureIds: string[] | undefined;
  try {
    answers = countAnswers(JSON.parse(backup.data['arborous:progress'] ?? '{}')?.state?.byCourse ?? {});
    lectureIds = Object.keys(JSON.parse(backup.data['arborous:courses'] ?? '{}')?.state?.courses ?? {});
  } catch {
    /* counted as none */
  }
  writeBackedUp({ at: Date.parse(backup.createdAt) || Date.now(), lectures: n, lectureIds, answers });
  window.location.reload();
  return true;
}

/**
 * The file beside this device, before one replaces the other. A backup
 * picked by mistake is most often an older one, so what this device has
 * that the file lacks is named, with the way to keep it.
 */
function RestoreDialog({ backup, onClose }: { backup: Backup; onClose: () => void }) {
  useDialog(onClose);
  const file = useMemo(() => holdingsOf(backup), [backup]);
  const [here] = useState(holdingsHere);
  const [last, setLast] = useState(readBackedUp);
  // "Back up this device first", used: what restoring replaces is in that file.
  const [saved, setSaved] = useState(false);
  // Not with sync on (lib/backup restoreUndoable), nor where the browser
  // would not keep the copy to undo with, found as Replace is pressed.
  const [undo, setUndo] = useState(restoreUndoable);
  const [refused, setRefused] = useState(false);
  const lost = Object.entries(here.lectures)
    .filter(([id]) => !(id in file.lectures))
    .map(([, title]) => title);
  const moreAnswers = Math.max(0, here.answers - file.answers);
  const losing = [
    lost.length > 0 && `${plural(lost.length, 'lecture')} (${lost.slice(0, 3).join(', ')}${lost.length > 3 ? ', …' : ''})`,
    moreAnswers > 0 && plural(moreAnswers, 'more answer'),
  ].filter(Boolean);
  const one = (lost.length === 1 && !moreAnswers) || (!lost.length && moreAnswers === 1);

  const replace = () => {
    let keep = undo;
    if (keep && !keepForUndo()) {
      // Said in the sheet first: it promised an Undo it cannot give.
      setUndo(false);
      setRefused(true);
      return;
    }
    if (refused) keep = false;
    // The sheet goes first: a failure's toast would be under it.
    if (!restore(backup, keep)) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-title"
    >
      <div className="my-8 w-full max-w-md paper-grain rounded-sm border border-border-strong bg-surface text-left shadow-md">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id="restore-title" className="font-semibold text-text">
            Restore this backup?
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="tap-safe -m-2 p-2 text-text-3 hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm">
          <dl className="border-y border-border">
            <div className="border-b border-border py-2">
              <dt className="mark text-text-3">The backup</dt>
              <dd className="mt-0.5 text-text">
                {madeAt(backup)} · {plural(Object.keys(file.lectures).length, 'lecture')} · {plural(file.answers, 'answer')}
              </dd>
            </div>
            <div className="py-2">
              <dt className="mark text-text-3">This device now</dt>
              <dd className="mt-0.5 text-text">
                {plural(Object.keys(here.lectures).length, 'lecture')} · {plural(here.answers, 'answer')}
                <span className="text-text-2"> · {last?.at ? `last backed up ${dated(last.at)}` : 'never backed up'}</span>
              </dd>
            </div>
          </dl>

          {saved ? (
            <p className="text-text-2">Backed up just now: everything on this device is in that file, to restore later if you want it back.</p>
          ) : losing.length > 0 ? (
            <div className="border-l-2 border-warning py-1 pl-3 text-text-2">
              <p>
                This device has {losing.join(' and ')} that the backup doesn&rsquo;t. Restoring replaces everything here, so
                {one ? ' it' : ' they'} would be lost.
              </p>
              <BackupButton
                className="tap-safe mt-1 text-accent underline-offset-4 hover:underline"
                label="Back up this device first"
                onSaved={() => {
                  setSaved(true);
                  setLast(readBackedUp());
                }}
              />
            </div>
          ) : (
            <p className="text-text-2">Restoring replaces every lecture and all progress on this device with the backup.</p>
          )}
          <p className="text-text-3">
            {undo
              ? 'You can undo it straight after.'
              : refused
                ? 'This browser won’t keep a copy to undo with, so it can’t be undone. Back up this device first if you may want it back.'
                : 'You’re signed in to sync, so it can’t be undone: the next sync carries it to your saved copy.'}
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="press">
            Cancel
          </button>
          <button type="button" onClick={replace} className="press press-ink">
            {refused ? 'Replace without Undo' : 'Replace with this backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
