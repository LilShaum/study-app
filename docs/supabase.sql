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
