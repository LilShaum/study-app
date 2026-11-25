-- The backend for share links and sync (src/lib/cloud.ts). Run once in the
-- Supabase SQL editor. Auth: email + password, "Confirm email" off.

-- Shared courses: anyone with the link can open one; only signed-in users can share.
create table public.shared_courses (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  course jsonb not null,
  created_at timestamptz not null default now(),
  constraint course_size check (pg_column_size(course) < 3000000)
);
alter table public.shared_courses enable row level security;
create policy "share your own" on public.shared_courses
  for insert to authenticated with check (owner = auth.uid());
create policy "see your own" on public.shared_courses
  for select to authenticated using (owner = auth.uid());
create policy "unshare your own" on public.shared_courses
  for delete to authenticated using (owner = auth.uid());

-- Opening a share link reads exactly one course by its id; nobody can list them.
create function public.get_shared_course(share_id uuid) returns jsonb
language sql stable security definer set search_path = public
as $$ select course from public.shared_courses where id = share_id $$;
grant execute on function public.get_shared_course(uuid) to anon, authenticated;

-- Sync: one saved copy of your data, readable and writable only by you.
create table public.user_state (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "own state" on public.user_state
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------- reminders by web push (docs/proposals/notifications.md) ----------------
-- Each device's push subscription, and the reminders it planned for the week.
-- The function arborous-push (supabase/functions/arborous-push) sends what is
-- due; pg_cron calls it each minute:
--   select cron.schedule('arborous-push', '* * * * *', $$ select net.http_post(
--     url := 'https://uepxpnqgrwvqruzexxsg.supabase.co/functions/v1/arborous-push',
--     headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb) $$);

create table public.arborous_push_subs (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  -- Only the browsers' push services: the sender posts to this address.
  constraint arborous_push_subs_known_service check (
    char_length(endpoint) <= 1000 and
    endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
  )
);
alter table public.arborous_push_subs enable row level security;
create policy "own subscriptions" on public.arborous_push_subs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.arborous_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('daily', 'second-look', 'exam', 'whats-new')),
  send_at timestamptz not null,
  title text not null check (char_length(title) <= 120),
  body text not null check (char_length(body) <= 300),
  url text not null default '' check (char_length(url) <= 300),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.arborous_reminders (send_at) where sent_at is null;
create index on public.arborous_reminders (user_id);
alter table public.arborous_reminders enable row level security;
create policy "own reminders" on public.arborous_reminders
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The push key pair, made by the function on first use. No policies: only the
-- function (service role) reads it, so the private key never leaves the server.
create table public.arborous_push_keys (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);
alter table public.arborous_push_keys enable row level security;
