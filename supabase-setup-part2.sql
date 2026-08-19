create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, voice_part, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'voice_part', ''),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- PART 2 : tables & features NOT yet created (safe to run)
-- Trigger block included again (idempotent) so new signups
-- always get a profile row.
-- ============================================================

-- ============================================================
-- 8) PUBLIC FORMS DATA — auditions, contact messages, newsletter
--    Run this whole section once (it is safe to re-run).
--    Anyone can submit; only admins can read.
-- ============================================================

-- Audition applications (Join Us form)
create table if not exists public.auditions (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  voice_part text not null default '',
  experience text not null default '',
  message text not null default '',
  status text not null default 'new' check (status in ('new','contacted','accepted','declined')),
  created_at timestamptz not null default now()
);

alter table public.auditions enable row level security;

drop policy if exists "anyone can submit an audition" on public.auditions;
create policy "anyone can submit an audition" on public.auditions
  for insert to anon, authenticated
  with check (true);

drop policy if exists "admins read auditions" on public.auditions;
create policy "admins read auditions" on public.auditions
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Contact messages (Contact form)
create table if not exists public.contact_msgs (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_msgs enable row level security;

drop policy if exists "anyone can send a message" on public.contact_msgs;
create policy "anyone can send a message" on public.contact_msgs
  for insert to anon, authenticated
  with check (true);

drop policy if exists "admins read messages" on public.contact_msgs;
create policy "admins read messages" on public.contact_msgs
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Newsletter subscribers (footer form)
create table if not exists public.newsletter_subs (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subs enable row level security;

drop policy if exists "anyone can subscribe" on public.newsletter_subs;
create policy "anyone can subscribe" on public.newsletter_subs
  for insert to anon, authenticated
  with check (true);

drop policy if exists "admins read subscribers" on public.newsletter_subs;
create policy "admins read subscribers" on public.newsletter_subs
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Explicit grants (harmless; covers fresh tables in the public schema)
grant select, insert on public.auditions to anon, authenticated;
grant select, insert on public.contact_msgs to anon, authenticated;
grant select, insert on public.newsletter_subs to anon, authenticated;

-- ============================================================
-- 9) PHASES 3 + 5 — events & RSVP, announcements, invites,
--    member approval (status) flow.
--    Run this whole section once (safe to re-run).
--    NOTE: re-running this section also upgrades an OLD
--    database to the new profile columns and role list.
-- ============================================================

-- ------------------------------------------------------------
-- 9a) Upgrade existing profiles tables (no-op on fresh installs)
-- ------------------------------------------------------------
alter table public.profiles add column if not exists status text not null default 'active'
  check (status in ('active','pending','inactive','rejected'));
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists gender text not null default ''
  check (gender in ('', 'male', 'female'));
alter table public.profiles add column if not exists year_of_study text not null default '';
alter table public.profiles add column if not exists course_program text not null default '';
alter table public.profiles add column if not exists preferred_language text not null default 'en';
alter table public.profiles add column if not exists avatar_url text not null default '';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member','leader','section_leader','admin'));

-- ------------------------------------------------------------
-- 9b) Member approval — admin sets a profile's status.
--     New signups start 'pending'; admins approve or reject.
-- ------------------------------------------------------------
create or replace function public.admin_set_status(p_email text, p_status text)
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
    raise exception 'Only admins can change member status';
  end if;
  if p_status not in ('active', 'pending', 'inactive', 'rejected') then
    raise exception 'Invalid status';
  end if;
  update public.profiles set status = p_status where email = lower(p_email);
  if not found then
    raise exception 'No profile with that email';
  end if;
end $$;

grant execute on function public.admin_set_status(text, text) to authenticated;

-- ------------------------------------------------------------
-- 9c) INVITES — admin creates an invite link for a future member.
--     The member claims it after sign-up via claim_invite().
-- ------------------------------------------------------------
create table if not exists public.invites (
  id bigint generated always as identity primary key,
  code text not null unique,
  email text not null,
  role text not null default 'member' check (role in ('member','leader','section_leader')),
  status text not null default 'open' check (status in ('open','used','revoked')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

alter table public.invites enable row level security;

drop policy if exists "admins read invites" on public.invites;
create policy "admins read invites" on public.invites
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "admins insert invites" on public.invites;
create policy "admins insert invites" on public.invites
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "admins revoke invites" on public.invites;
create policy "admins revoke invites" on public.invites
  for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Self-service claim: a pending member activates their account and
-- receives the role attached to their invite. Server-side checks only.
create or replace function public.claim_invite(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites%rowtype;
  v_status text;
  v_role text;
begin
  select status, role into v_status, v_role from public.profiles where id = auth.uid();
  if v_status is distinct from 'pending' then
    return 'already-active';
  end if;

  select * into v_invite from public.invites
    where code = p_code and status = 'open'
    limit 1;

  if not found then
    raise exception 'This invite link is invalid or has expired.';
  end if;
  if lower(v_invite.email) is distinct from lower((select email from auth.users where id = auth.uid())) then
    raise exception 'This invite link was issued to a different email address.';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'This invite link has expired.';
  end if;

  update public.profiles
    set role = v_invite.role, status = 'active'
    where id = auth.uid();
  update public.invites set status = 'used' where id = v_invite.id;
  return 'activated';
end $$;

grant execute on function public.claim_invite(text) to authenticated;

-- ------------------------------------------------------------
-- 9d) EVENTS — bilingual schedule with RSVP (Phase 3)
-- ------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_sw text not null default '',
  description_en text not null default '',
  description_sw text not null default '',
  event_type text not null default 'other'
    check (event_type in ('rehearsal','concert','mass','meeting','social','audition','training','other')),
  start_time timestamptz not null,
  end_time timestamptz,
  location text not null default '',
  is_mandatory boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- Active members and above can read the schedule.
drop policy if exists "active members read events" on public.events;
create policy "active members read events" on public.events
  for select to authenticated
  using (
    (select status from public.profiles where id = auth.uid()) = 'active'
  );

-- Admins and leaders can create / edit / delete events.
drop policy if exists "leaders manage events" on public.events;
create policy "leaders manage events" on public.events
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) in ('leader','admin'));

drop policy if exists "leaders update events" on public.events;
create policy "leaders update events" on public.events
  for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) in ('leader','admin'));

drop policy if exists "leaders delete events" on public.events;
create policy "leaders delete events" on public.events
  for delete to authenticated
  using ((select role from public.profiles where id = auth.uid()) in ('leader','admin'));

-- ------------------------------------------------------------
-- 9e) EVENT RSVPs — one row per member per event
-- ------------------------------------------------------------
create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('attending','not_attending','maybe')),
  note text not null default '',
  updated_at timestamptz not null default now(),
  unique (event_id, member_id)
);

alter table public.event_rsvps enable row level security;

drop policy if exists "rsvp read own" on public.event_rsvps;
create policy "rsvp read own" on public.event_rsvps
  for select to authenticated
  using (member_id = auth.uid());

drop policy if exists "leaders read all rsvps" on public.event_rsvps;
create policy "leaders read all rsvps" on public.event_rsvps
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) in ('leader','admin'));

drop policy if exists "rsvp insert own" on public.event_rsvps;
create policy "rsvp insert own" on public.event_rsvps
  for insert to authenticated
  with check (
    member_id = auth.uid()
    and (select status from public.profiles where id = auth.uid()) = 'active'
  );

drop policy if exists "rsvp update own" on public.event_rsvps;
create policy "rsvp update own" on public.event_rsvps
  for update to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

drop policy if exists "rsvp delete own" on public.event_rsvps;
create policy "rsvp delete own" on public.event_rsvps
  for delete to authenticated
  using (member_id = auth.uid());

-- ------------------------------------------------------------
-- 9f) ANNOUNCEMENTS — bilingual, everyone active can read,
--     admins and leaders post.
-- ------------------------------------------------------------
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title_en text not null,
  title_sw text not null default '',
  content_en text not null default '',
  content_sw text not null default '',
  is_pinned boolean not null default false,
  author_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "active members read announcements" on public.announcements;
create policy "active members read announcements" on public.announcements
  for select to authenticated
  using ((select status from public.profiles where id = auth.uid()) = 'active');

drop policy if exists "leaders insert announcements" on public.announcements;
create policy "leaders insert announcements" on public.announcements
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) in ('leader','admin'));

drop policy if exists "leaders update announcements" on public.announcements;
create policy "leaders update announcements" on public.announcements
  for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) in ('leader','admin'));

drop policy if exists "leaders delete announcements" on public.announcements;
create policy "leaders delete announcements" on public.announcements
  for delete to authenticated
  using ((select role from public.profiles where id = auth.uid()) in ('leader','admin'));

-- Seed a welcome announcement (bilingual)
insert into public.announcements (title_en, title_sw, content_en, content_sw, is_pinned)
select v.title_en, v.title_sw, v.content_en, v.content_sw, v.is_pinned
from (values
  ('Karibu Maranatha!', 'Karibu Maranatha!',
   'Welcome to the members portal. Check the Events tab and RSVP to the next rehearsal so the leaders can plan.',
   'Karibu kwenye portal ya wanachama. Angalia Matukio na uthibitishe mahudhurio kwenye mazoezi yajayo ili viongozi waweze kupanga.',
   true)
) as v(title_en, title_sw, content_en, content_sw, is_pinned)
where not exists (select 1 from public.announcements a where a.title_en = v.title_en);

-- Explicit grants for the new tables
grant select on public.events, public.event_rsvps, public.announcements, public.invites to authenticated;
grant insert, update, delete on public.events, public.event_rsvps, public.announcements, public.invites to authenticated;
