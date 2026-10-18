import { useRef, type ChangeEvent } from 'react';
import { backUpNow, coursesIn, readBackup, restoreBackup } from '@/lib/backup';
import { countAnswers, writeBackedUp } from '@/lib/keepSafe';
import { toast } from '@/store/toast';


/** Saves every course, all progress and settings as one file. */
export function BackupButton({ className = 'press tap-safe' }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => void backUpNow()}
    >
      Back up everything
    </button>
  );
}

/**
 * Replaces what this device has saved with a backup file, after asking.
 * Reloads so every part of the app starts from what was restored.
 */
export function RestoreButton({ className = 'press tap-safe', label = 'Restore from a backup' }: { className?: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const read = readBackup(await file.text());
    if (!read.ok) {
      toast(read.error, { type: 'error' });
      return;
    }
    const n = coursesIn(read.backup);
    const when = read.backup.createdAt ? new Date(read.backup.createdAt).toLocaleDateString() : 'an unknown date';
    const ok = window.confirm(
      `Restore the backup from ${when}, with ${n} ${n === 1 ? 'lecture' : 'lectures'}?\n\nThis replaces every lecture and all progress on this device.`,
    );
    if (!ok) return;
    if (!restoreBackup(read.backup)) {
      toast("This browser's storage is full or blocked, so the backup couldn't be restored. Nothing was changed.", { type: 'error' });
      return;
    }
    // A restore is a backup as of when that file was made: the student holds it.
    let answers = 0;
    let lectureIds: string[] | undefined;
    try {
      answers = countAnswers(JSON.parse(read.backup.data['arborous:progress'] ?? '{}')?.state?.byCourse ?? {});
      lectureIds = Object.keys(JSON.parse(read.backup.data['arborous:courses'] ?? '{}')?.state?.courses ?? {});
    } catch {
      /* counted as none */
    }
    writeBackedUp({ at: Date.parse(read.backup.createdAt) || Date.now(), lectures: n, lectureIds, answers });
    window.location.reload();
  };

  return (
    <>
      <button type="button" className={className} onClick={() => input.current?.click()}>
        {label}
      </button>
      <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
    </>
  );
}
