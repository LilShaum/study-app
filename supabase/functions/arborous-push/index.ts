// Arborous reminders by web push (docs/proposals/notifications.md).
//
// GET  → the public push key, made here on first use. The private half never
//        leaves the database (table arborous_push_keys, readable only here).
// POST → send every reminder that is due, at most two a day per student.
//        Run each minute by pg_cron (job arborous-push). It only sends what
//        students' own devices planned, so a stray call does no harm.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const APP = 'https://lilshaum.github.io/study-app/';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const PER_DAY = 2;
/** A reminder more than this late (the job was down) is dropped, not sent. */
const STALE_MS = 6 * 3600_000;

async function keys(): Promise<{ public_key: string; private_key: string }> {
  const { data } = await db.from('arborous_push_keys').select('public_key, private_key').eq('id', 1).maybeSingle();
  if (data) return data;
  const made = webpush.generateVAPIDKeys();
  const row = { id: 1, public_key: made.publicKey, private_key: made.privateKey };
  const { error } = await db.from('arborous_push_keys').insert(row);
  if (error) {
    // Made at the same moment by another call: use the one stored.
    const { data: stored } = await db.from('arborous_push_keys').select('public_key, private_key').eq('id', 1).single();
    return stored!;
  }
  return row;
}

async function run(): Promise<{ sent: number; skipped: number }> {
  const k = await keys();
  webpush.setVapidDetails(APP, k.public_key, k.private_key);
  const now = Date.now();
  const { data: due } = await db
    .from('arborous_reminders')
    .select('id, user_id, send_at, title, body, url')
    .is('sent_at', null)
    .lte('send_at', new Date(now).toISOString())
    .order('send_at')
    .limit(200);
  let sent = 0;
  let skipped = 0;
  const sentToday = new Map<string, number>();
  for (const r of due ?? []) {
    const mark = () => db.from('arborous_reminders').update({ sent_at: new Date().toISOString() }).eq('id', r.id);
    // A reminder not sent is deleted, so sent_at counts only what was sent.
    const drop = () => db.from('arborous_reminders').delete().eq('id', r.id);
    if (now - Date.parse(r.send_at) > STALE_MS) {
      await drop();
      skipped++;
      continue;
    }
    if (!sentToday.has(r.user_id)) {
      const { count } = await db
        .from('arborous_reminders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', r.user_id)
        .gte('sent_at', new Date(now - 24 * 3600_000).toISOString());
      sentToday.set(r.user_id, count ?? 0);
    }
    if ((sentToday.get(r.user_id) ?? 0) >= PER_DAY) {
      await drop();
      skipped++;
      continue;
    }
    const { data: subs } = await db.from('arborous_push_subs').select('endpoint, p256dh, auth').eq('user_id', r.user_id);
    const payload = JSON.stringify({ title: r.title, body: r.body, url: r.url });
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // The device unsubscribed or the app was removed: forget it.
        if (code === 404 || code === 410) await db.from('arborous_push_subs').delete().eq('endpoint', s.endpoint);
      }
    }
    await mark();
    sentToday.set(r.user_id, (sentToday.get(r.user_id) ?? 0) + 1);
    sent++;
  }
  return { sent, skipped };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const body = req.method === 'GET' ? { publicKey: (await keys()).public_key } : await run();
    return new Response(JSON.stringify(body), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'failed' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
