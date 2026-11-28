import { cloud, hasSavedSignIn } from './cloud';
import { planReminders } from './reminderPlan';
import { plannedMinutes, studiedToday } from './todaySitting';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { useRemindersStore } from '@/store/reminders';

/**
 * Reminders by web push (docs/proposals/notifications.md). The device
 * subscribes and saves its next week of reminders to Supabase
 * (`arborous_push_subs`, `arborous_reminders`, each row its owner's alone);
 * the `arborous-push` function sends the ones that are due, each minute.
 *
 * The public half of the server's push key. The private half was made on
 * the server and never leaves it (supabase/functions/arborous-push).
 */
const PUSH_KEY = 'BPvFCmWRKSKf61INk_DY89d5gDYdJJnRkNENdwyl83XTGXX6UE6_Mmgm8I8kLwNXhG-j1OqxwZZy4I1wnZC4Hrk';

export type PushBlock = 'unsupported' | 'install' | 'signin' | 'denied' | null;

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInstalled(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** What stands between this device and reminders, or null when nothing does. */
export function pushBlock(): PushBlock {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return isIos() && !isInstalled() ? 'install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (!hasSavedSignIn()) return 'signin';
  return null;
}

/** The line that says why, in the student's words. */
export const BLOCK_LINE: Record<Exclude<PushBlock, null>, string> = {
  unsupported: 'This browser can’t show reminders.',
  install: 'Add Arborous to your Home Screen to get reminders: Share, then Add to Home Screen.',
  signin: 'Sign in to get reminders, so they can reach you with the app closed.',
  denied: 'Notifications are blocked for Arborous. Allow them in your browser or phone settings, then try again.',
};

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Asks for permission (it must come from a tap), subscribes this device and
 * plans its reminders. Throws with a line to show when it can't.
 */
export async function turnOnReminders(): Promise<void> {
  const block = pushBlock();
  if (block) throw new Error(BLOCK_LINE[block]);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(BLOCK_LINE.denied);
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(PUSH_KEY),
    }));
  const json = sub.toJSON();
  const sb = await cloud();
  // The same endpoint again (a second tap, a new sign-in): replace it.
  await sb.from('arborous_push_subs').delete().eq('endpoint', sub.endpoint);
  const { error } = await sb.from('arborous_push_subs').insert({
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  });
  if (error) throw error;
  useRemindersStore.getState().set({ on: true });
  await saveReminderPlan(true);
}

/** Unsubscribes this device and drops the reminders still to come. */
export async function turnOffReminders(): Promise<void> {
  useRemindersStore.getState().set({ on: false });
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const sb = await cloud();
      await sb.from('arborous_push_subs').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
    if (hasSavedSignIn()) {
      const sb = await cloud();
      await sb.from('arborous_reminders').delete().is('sent_at', null);
    }
  } catch {
    /* Offline: the server forgets a dead subscription the first time it fails. */
  }
}

let lastSaved = '';

/**
 * Plans the next week and saves it in place of the last plan. Called when the
 * app opens and when it is put away (lib/autoSync) and when a setting changes.
 * Nothing is sent when the plan is what was last saved.
 */
export async function saveReminderPlan(force = false): Promise<void> {
  const settings = useRemindersStore.getState();
  if (!settings.on || !hasSavedSignIn()) return;
  const now = Date.now();
  const courses = useCoursesStore.getState().courses;
  const plan = planReminders({
    courses,
    progress: useProgressStore.getState().byCourse,
    now,
    settings,
    minutesFor: plannedMinutes,
    studiedTodaySeconds: Object.keys(courses).reduce((n, id) => n + studiedToday(id, now), 0),
  });
  const rows = plan.map((r) => ({
    kind: r.kind,
    send_at: new Date(r.sendAt).toISOString(),
    title: r.title.slice(0, 120),
    body: r.body.slice(0, 300),
    url: r.url.slice(0, 300),
  }));
  const key = JSON.stringify(rows);
  if (!force && key === lastSaved) return;
  const sb = await cloud();
  const { error: cleared } = await sb.from('arborous_reminders').delete().is('sent_at', null);
  if (cleared) throw cleared;
  if (rows.length) {
    const { error } = await sb.from('arborous_reminders').insert(rows);
    if (error) throw error;
  }
  lastSaved = key;
}
