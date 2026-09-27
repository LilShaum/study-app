import { useRef, type ChangeEvent } from 'react';
import { backupFileName, coursesIn, makeBackup, readBackup, restoreBackup, saveFile } from '@/lib/backup';
import { toast } from '@/store/toast';

/** Saves every course, all progress and settings as one file. */
export function BackupButton({ className = 'press tap-safe' }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const now = new Date();
        void saveFile(backupFileName(now), JSON.stringify(makeBackup(now)));
      }}
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
      `Restore the backup from ${when}, with ${n} ${n === 1 ? 'course' : 'courses'}?\n\nThis replaces every course and all progress on this device.`,
    );
    if (!ok) return;
    if (!restoreBackup(read.backup)) {
      toast("This browser's storage is full or blocked, so the backup couldn't be restored. Nothing was changed.", { type: 'error' });
      return;
    }
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
