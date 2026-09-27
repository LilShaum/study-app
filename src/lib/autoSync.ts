import { cloudError, hasSavedSignIn, syncNow } from './cloud';
import { toast } from '@/store/toast';

/** Leaving the app more often than this does not sync again. */
const MIN_GAP_MS = 60_000;

let lastAttempt = 0;

function attempt(quietly: boolean) {
  if (!hasSavedSignIn() || Date.now() - lastAttempt < MIN_GAP_MS) return;
  lastAttempt = Date.now();
  syncNow().catch((e) => {
    // Offline is the normal case on a phone; say nothing then. Anything else
    // is worth one line, or a sync that silently stopped would go unnoticed.
    const message = cloudError(e);
    if (!quietly && !/reach the server/.test(message)) toast(`Sync failed: ${message}`, { type: 'error' });
  });
}

/**
 * Syncs when the app opens and whenever it is put away, for students who
 * signed in (see routes/SyncRoute). Opening is when the other device's work
 * is wanted; leaving is when this device's work needs to get out.
 */
export function startAutoSync(): void {
  attempt(false);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') attempt(true);
    else attempt(false);
  });
}
