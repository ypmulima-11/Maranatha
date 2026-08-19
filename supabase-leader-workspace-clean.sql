-- ============================================================
-- LEADER WORKSPACE + PUBLIC TEAM PAGE — run ONCE (safe to re-run)
-- 1) leader_records — each leader's private records
--    (only the owner and admins can read them)
-- 2) get_public_leaders() — safe public view of the leadership
--    (name, voice part, title, role — no email/phone/dob)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Leader workspace records
-- ------------------------------------------------------------
create table if not exists public.leader_records (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  record_date date,
  created_at timestamptz not null default now()
);

alter table public.leader_records enable row level security;

-- Drop existing policies if they exist
drop policy if exists "owner manages own records" on public.leader_records;
drop policy if exists "admins read all records" on public.leader_records;

create policy "owner manages own records" on public.leader_records
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "admins read all records" on public.leader_records
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

grant select, insert, update, delete on public.leader_records to authenticated;

-- ------------------------------------------------------------
-- 2) Public team page — safe fields of active leaders only.
--    Runs as the table owner so anon visitors can read it
--    without exposing emails, phones or birth dates.
-- ------------------------------------------------------------
create or replace function public.get_public_leaders()
returns table (id uuid, full_name text, voice_part text, title text, role text)
language sql security definer set search_path = public
as $$
  select id, full_name, voice_part, title, role
  from public.profiles
  where role in ('leader','section_leader','admin') and status = 'active'
  order by case role when 'admin' then 0 when 'leader' then 1 else 2 end, full_name;
$$;

grant execute on function public.get_public_leaders() to anon, authenticated;