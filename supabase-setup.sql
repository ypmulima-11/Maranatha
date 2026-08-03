-- ============================================================
-- MARANATHA CHOIR — member portal setup (run ONCE)
-- Where: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ------------------------------------------------------------
-- 1) PROFILES — one row per signed-up user
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  voice_part text not null default '',
  role text not null default 'member' check (role in ('member','leader','admin')),
  title text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ------------------------------------------------------------
-- 2) Auto-create a profile when anyone signs up
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 3) PROFILES RLS — users read/update their own row only.
--    Role changes are possible ONLY through admin_set_role (below).
-- ------------------------------------------------------------
create policy "read own profile" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy "admin read all profiles" on public.profiles
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "insert own profile" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy "update own profile (role locked)" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- ------------------------------------------------------------
-- 4) ROLE MANAGEMENT — security-definer RPC, admin only.
--    The app calls this when an admin changes a member's role.
-- ------------------------------------------------------------
create or replace function public.admin_set_role(p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'Only admins can change roles';
  end if;
  if p_role not in ('member', 'leader', 'admin') then
    raise exception 'Invalid role';
  end if;
  update public.profiles set role = p_role where email = lower(p_email);
  if not found then
    raise exception 'No profile with that email';
  end if;
end $$;

grant execute on function public.admin_set_role(text, text) to authenticated;

-- ------------------------------------------------------------
-- 5) RESOURCES — the role-gated content (member / leader / admin)
-- ------------------------------------------------------------
create table if not exists public.resources (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null default '',
  date text not null default '',
  audience text not null check (audience in ('member','leader','admin')),
  created_at timestamptz not null default now()
);

alter table public.resources enable row level security;

-- Users see resources aimed at their own role; admins see everything.
create policy "read resources for own role" on public.resources
  for select to authenticated
  using (
    audience = (select role from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "admin insert resources" on public.resources
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin update resources" on public.resources
  for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admin delete resources" on public.resources
  for delete to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- ------------------------------------------------------------
-- 6) Seed placeholder resources (edit or delete later)
-- ------------------------------------------------------------
insert into public.resources (title, body, date, audience)
select v.title, v.body, v.date, v.audience
from (values
  ('Rehearsal schedule', 'The weekly rehearsal schedule will be published here by the leaders.', '', 'member'),
  ('Member handbook', 'Guidelines, dress code and member expectations.', '', 'member'),
  ('Leadership notes', 'Practice plans, repertoire and section reports.', '', 'leader'),
  ('Administrator desk', 'Accounts, site settings and official documents.', '', 'admin')
) as v(title, body, date, audience)
where not exists (select 1 from public.resources r where r.title = v.title);

-- ------------------------------------------------------------
-- 7) AFTER your first sign-up, promote yourself to admin.
--    Replace you@example.com with your email and run ONLY this line:
--
--    update public.profiles set role = 'admin' where email = 'you@example.com';
-- ------------------------------------------------------------
