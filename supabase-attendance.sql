-- ============================================================
-- ATTENDANCE — QR / code check-in — run ONCE (safe to re-run)
--
-- Requires: profiles (+ roles) and the events table from
-- supabase-sections-8-9.sql.
--
-- Flow:
--   * A leader opens a session and shows the QR / code.
--   * Members scan (opens members.html?code=XXXX) or type the code.
--   * Check-ins within 15 minutes of start are 'present',
--     afterwards 'late'. Leaders can override any status.
--   * Codes expire (default 20 min) and can be rotated so they
--     cannot be shared after the fact.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Helper: is the current user an active leader/admin?
-- ------------------------------------------------------------
create or replace function public.is_leader_or_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('leader', 'section_leader', 'admin')
      and status = 'active'
  );
$$;

grant execute on function public.is_leader_or_admin() to authenticated;

-- ------------------------------------------------------------
-- 2) Tables
-- ------------------------------------------------------------
create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_id uuid references public.events(id) on delete set null,
  starts_at timestamptz not null default now(),
  is_open boolean not null default true,
  code text,
  code_expires_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('present', 'late', 'absent', 'excused')),
  check_in_time timestamptz,
  notes text,
  marked_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, member_id)
);

create index if not exists attendance_member_idx on public.attendance (member_id);
create index if not exists attendance_session_idx on public.attendance (session_id);
create index if not exists sessions_open_idx on public.attendance_sessions (is_open, starts_at);

alter table public.attendance_sessions enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "authenticated read sessions" on public.attendance_sessions;
drop policy if exists "creator manages own sessions" on public.attendance_sessions;
drop policy if exists "admins manage all sessions" on public.attendance_sessions;
drop policy if exists "member reads own attendance" on public.attendance;
drop policy if exists "leaders read all attendance" on public.attendance;

create policy "authenticated read sessions" on public.attendance_sessions
  for select to authenticated
  using (true);

create policy "creator manages own sessions" on public.attendance_sessions
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "admins manage all sessions" on public.attendance_sessions
  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "member reads own attendance" on public.attendance
  for select to authenticated
  using (member_id = auth.uid());

create policy "leaders read all attendance" on public.attendance
  for select to authenticated
  using (public.is_leader_or_admin());

grant select, insert, update, delete on public.attendance_sessions to authenticated;
grant select on public.attendance to authenticated;

-- ------------------------------------------------------------
-- 3) Code generator (unambiguous characters only)
-- ------------------------------------------------------------
create or replace function public.new_checkin_code()
returns text
language sql volatile
as $$
  select rpad(
    upper(regexp_replace(md5(random()::text || clock_timestamp()::text), '[017ILSU]', '', 'g')),
    6, substring(upper('23456789ABCDEFGHJKMNPQRSTUVWXYZ'), 1, 1)
  );
$$;

-- ------------------------------------------------------------
-- 4) Leader: create a session, returns its id + first code
-- ------------------------------------------------------------
create or replace function public.leader_create_session(
  p_title text,
  p_event_id uuid default null,
  p_code_minutes int default 20
)
returns table (session_id uuid, code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
begin
  if not public.is_leader_or_admin() then
    raise exception 'Only active leaders or admins can open attendance sessions.';
  end if;
  if p_title is null or length(trim(p_title)) < 2 then
    raise exception 'Give the session a title.';
  end if;
  v_code := public.new_checkin_code();
  insert into public.attendance_sessions (title, event_id, starts_at, code, code_expires_at, created_by)
  values (
    trim(p_title), p_event_id, now(), v_code,
    now() + make_interval(mins => greatest(coalesce(p_code_minutes, 20), 5)),
    auth.uid()
  )
  returning id into v_id;
  return query select v_id, v_code;
end;
$$;

-- ------------------------------------------------------------
-- 5) Leader: rotate the live code (old one stops working)
-- ------------------------------------------------------------
create or replace function public.leader_rotate_code(p_session_id uuid, p_code_minutes int default 20)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_leader_or_admin() then
    raise exception 'Only active leaders or admins can rotate codes.';
  end if;
  update public.attendance_sessions
  set code = public.new_checkin_code(),
      code_expires_at = now() + make_interval(mins => greatest(coalesce(p_code_minutes, 20), 5)),
      updated_at = now()
  where id = p_session_id
    and (created_by = auth.uid()
         or (select role from public.profiles where id = auth.uid()) = 'admin')
  returning code into v_code;
  if v_code is null then
    raise exception 'Session not found.';
  end if;
  return v_code;
end;
$$;

-- ------------------------------------------------------------
-- 6) Leader: close a session (stops all further check-ins)
-- ------------------------------------------------------------
create or replace function public.leader_close_session(p_session_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_leader_or_admin() then
    raise exception 'Only active leaders or admins can close sessions.';
  end if;
  update public.attendance_sessions
  set is_open = false, code = null, code_expires_at = null, updated_at = now()
  where id = p_session_id
    and (created_by = auth.uid()
         or (select role from public.profiles where id = auth.uid()) = 'admin');
end;
$$;

-- ------------------------------------------------------------
-- 7) Leader: set/override one member's status on a session
-- ------------------------------------------------------------
create or replace function public.leader_mark_attendance(p_session_id uuid, p_member_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_leader_or_admin() then
    raise exception 'Only active leaders or admins can mark attendance.';
  end if;
  if p_status not in ('present', 'late', 'absent', 'excused') then
    raise exception 'Invalid status.';
  end if;
  insert into public.attendance (session_id, member_id, status, check_in_time, marked_by)
  values (
    p_session_id, p_member_id, p_status,
    case when p_status in ('present', 'late') then now() else null end,
    auth.uid()
  )
  on conflict (session_id, member_id)
  do update set status = excluded.status, marked_by = excluded.marked_by, updated_at = now();
end;
$$;

grant execute on function public.leader_mark_attendance(uuid, uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 7b) Leader: remove a member's attendance row (unmark)
-- ------------------------------------------------------------
create or replace function public.leader_unmark_attendance(p_session_id uuid, p_member_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_leader_or_admin() then
    raise exception 'Only active leaders or admins can change attendance.';
  end if;
  delete from public.attendance
  where session_id = p_session_id and member_id = p_member_id;
end;
$$;

grant execute on function public.leader_unmark_attendance(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- 8) Member: check in with a code ('present' within 15 min, then 'late')
--    Returns one of: present:<title> | late:<title> | already | invalid | closed
-- ------------------------------------------------------------
create or replace function public.check_in_with_code(p_code text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  s record;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if p_code is null then
    return 'invalid';
  end if;
  select * into s from public.attendance_sessions
  where upper(btrim(code)) = upper(btrim(p_code))
  order by starts_at desc
  limit 1;
  if not found then
    return 'invalid';
  end if;
  if not s.is_open or s.code_expires_at is null or s.code_expires_at <= now() then
    return 'closed';
  end if;
  if exists (select 1 from public.attendance where session_id = s.id and member_id = auth.uid()) then
    return 'already';
  end if;
  insert into public.attendance (session_id, member_id, status, check_in_time, marked_by)
  values (
    s.id, auth.uid(),
    case when now() > s.starts_at + interval '15 minutes' then 'late' else 'present' end,
    now(), auth.uid()
  );
  return case when now() > s.starts_at + interval '15 minutes'
              then 'late:' || s.title
              else 'present:' || s.title end;
end;
$$;

-- ------------------------------------------------------------
-- 8) Leader: full roll for a session (every active member, unmarked = null)
-- ------------------------------------------------------------
create or replace function public.session_roll(p_session_id uuid)
returns table (member_id uuid, full_name text, voice_part text, status text, check_in_time timestamptz)
language sql security definer set search_path = public
as $$
  select pr.id, pr.full_name, pr.voice_part, a.status, a.check_in_time
  from public.profiles pr
  left join public.attendance a on a.member_id = pr.id and a.session_id = p_session_id
  where pr.status = 'active'
  order by pr.full_name;
$$;

-- ------------------------------------------------------------
-- 9) Member: my recent attendance history
-- ------------------------------------------------------------
create or replace function public.my_attendance()
returns table (session_title text, started_at timestamptz, status text, check_in_time timestamptz)
language sql security invoker set search_path = public
as $$
  select s.title, s.starts_at, a.status, a.check_in_time
  from public.attendance a
  join public.attendance_sessions s on s.id = a.session_id
  where a.member_id = auth.uid()
  order by s.starts_at desc
  limit 30;
$$;

grant execute on function public.new_checkin_code() to authenticated;
grant execute on function public.leader_create_session(text, uuid, int) to authenticated;
grant execute on function public.leader_rotate_code(uuid, int) to authenticated;
grant execute on function public.leader_close_session(uuid) to authenticated;
grant execute on function public.check_in_with_code(text) to authenticated;
grant execute on function public.session_roll(uuid) to authenticated;
grant execute on function public.my_attendance() to authenticated;
