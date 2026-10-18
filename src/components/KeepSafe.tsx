import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { keepSafe, readBackedUp, writeBackedUp, countAnswers, type KeepSafe as Notice } from '@/lib/keepSafe';
import { storageUsage } from '@/lib/safeStorage';
import { hasSavedSignIn } from '@/lib/cloud';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { toast } from '@/store/toast';
import { backUpNow } from '@/lib/backup';

const ago = (at: number, now: number) => {
  const days = Math.floor((now - at) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

/**
 * One quiet line on the library about keeping the student's work safe: that
 * storage is nearly full, or that everything is only on this device and has
 * not been backed up (lib/keepSafe.ts decides when). Nothing at all otherwise.
 */
export function KeepSafe() {
  const lectureIds = useCoursesStore(useShallow((s) => Object.keys(s.courses)));
  const lectures = lectureIds.length;
  const answers = useProgressStore((s) => countAnswers(s.byCourse));
  // Judged as the library opens; rendering must not read the clock.
  const [now] = useState(Date.now);
  const [backedUp, setBackedUp] = useState(readBackedUp);
  // Read once: it adds up every stored value, which is not for every render.
  const [usage] = useState(storageUsage);
  const notice: Notice | null = keepSafe({
    lectures,
    answers,
    lectureIds,
    syncOn: hasSavedSignIn(),
    backedUp,
    storagePct: usage ? Math.round((usage.used / usage.limit) * 100) : null,
    now,
  });
  if (!notice) return null;

  const backUp = async () => {
    if (await backUpNow()) {
      setBackedUp(readBackedUp());
      toast('Backed up. Keep the file somewhere other than this device: Files, iCloud Drive or an email to yourself.', { type: 'success' });
    }
  };
  const notNow = () => {
    const next = { ...(backedUp ?? { at: 0, lectures: 0, answers: 0 }), dismissedAt: Date.now() };
    writeBackedUp(next);
    setBackedUp(next);
  };
  const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`;

  return (
    <p className={`mb-7 border-y border-border py-3 text-small ${notice.kind === 'storage' ? 'text-warning' : 'text-text-2'}`}>
      {notice.kind === 'storage' ? (
        <>Storage is {notice.pct}% full. Back up, then remove a lecture you no longer need, before a save fails. </>
      ) : notice.lastAt ? (
        <>
          Last backup {ago(notice.lastAt, now)}, {plural(notice.answersSince, 'answer')} since. They are only on this
          device.{' '}
        </>
      ) : (
        <>
          Your {plural(notice.lectures, 'lecture')} and {plural(notice.answers, 'answer')} are only on this device, and
          have never been backed up.{' '}
        </>
      )}
      <span className="whitespace-nowrap">
        <button type="button" onClick={() => void backUp()} className="tap-safe text-accent underline-offset-4 hover:underline">
          Back up now
        </button>
        {notice.kind === 'backup' && (
          <>
            <span className="mx-1.5 text-text-3">·</span>
            <button type="button" onClick={notNow} className="tap-safe text-text-3 hover:text-text">
              Not now
            </button>
          </>
        )}
      </span>
    </p>
  );
}
