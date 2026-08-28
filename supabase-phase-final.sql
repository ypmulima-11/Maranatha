-- ============================================================
-- PHASE FINAL — music library (Storage), attendance reports,
-- private member directory. Run ONCE (safe to re-run).
-- Requires: profiles, attendance tables (supabase-attendance.sql).
-- ============================================================

-- ------------------------------------------------------------
-- 1) MUSIC LIBRARY — sheet music & practice tracks
-- ------------------------------------------------------------
create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'other' check (kind in ('score', 'track', 'other')),
  voice_part text not null default 'all' check (voice_part in ('all', 'soprano', 'alto', 'tenor', 'bass')),
  description text not null default '',
  file_path text not null,
  file_name text not null default '',
  file_size bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.library_items enable row level security;

drop policy if exists "active members read library" on public.library_items;
drop policy if exists "leaders add library items" on public.library_items;
drop policy if exists "leaders manage library items" on public.library_items;

create policy "active members read library" on public.library_items
  for select to authenticated
  using ((select status from public.profiles where id = auth.uid()) = 'active');

create policy "leaders add library items" on public.library_items
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) in ('leader', 'section_leader', 'admin'));

create policy "leaders manage library items" on public.library_items
  for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) in ('leader', 'section_leader', 'admin'));

grant select, insert, update, delete on public.library_items to authenticated;

-- ------------------------------------------------------------
-- 2) STORAGE — private 'library' bucket (signed URLs for members)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('library', 'library', false)
on conflict (id) do nothing;

drop policy if exists "active members read library files" on storage.objects;
drop policy if exists "leaders add library files" on storage.objects;
drop policy if exists "leaders manage library files" on storage.objects;

create policy "active members read library files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'library'
    and (select status from public.profiles where id = auth.uid()) = 'active'
  );

create policy "leaders add library files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'library'
    and (select role from public.profiles where id = auth.uid()) in ('leader', 'section_leader', 'admin')
  );

create policy "leaders manage library files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'library'
    and (select role from public.profiles where id = auth.uid()) in ('leader', 'section_leader', 'admin')
  );

-- ------------------------------------------------------------
-- 3) ATTENDANCE REPORT — per-member season summary (leaders only)
--    pct = share of marked sessions attended (present or late)
-- ------------------------------------------------------------
create or replace function public.attendance_overview()
returns table (
  member_id uuid, full_name text, voice_part text,
  present bigint, late bigint, absent bigint, excused bigint,
  marked bigint, pct numeric
)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_leader_or_admin() then
    raise exception 'Only active leaders or admins can view attendance reports.';
  end if;
  return query
  select pr.id, pr.full_name, pr.voice_part,
    count(a.id) filter (where a.status = 'present')::bigint,
    count(a.id) filter (where a.status = 'late')::bigint,
    count(a.id) filter (where a.status = 'absent')::bigint,
    count(a.id) filter (where a.status = 'excused')::bigint,
    count(a.id)::bigint,
    case
      when count(a.id) = 0 then null
      else round(100.0 * count(a.id) filter (where a.status in ('present', 'late')) / count(a.id))
    end
  from public.profiles pr
  left join public.attendance a on a.member_id = pr.id
  where pr.status = 'active'
  group by pr.id, pr.full_name, pr.voice_part
  order by pr.full_name;
end;
$$;

grant execute on function public.attendance_overview() to authenticated;

-- ------------------------------------------------------------
-- 4) MEMBER DIRECTORY — privacy-limited
--    directory():        safe fields only (active members)
--    directory_full():   adds phone + email (leaders/admins)
-- ------------------------------------------------------------
create or replace function public.directory()
returns table (member_id uuid, full_name text, voice_part text, title text, role text)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null
     or (select status from public.profiles where id = auth.uid()) <> 'active' then
    raise exception 'Sign in with an active account to view the directory.';
  end if;
  return query
  select pr.id, pr.full_name, pr.voice_part, pr.title, pr.role
  from public.profiles pr
  where pr.status = 'active'
  order by case lower(coalesce(pr.voice_part, ''))
             when 'soprano' then 1
             when 'alto' then 2
             when 'tenor' then 3
             when 'bass' then 4
             else 5 end,
           pr.full_name;
end;
$$;

create or replace function public.directory_full()
returns table (
  member_id uuid, full_name text, voice_part text, title text, role text,
  phone text, email text
)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_leader_or_admin() then
    raise exception 'Contact details are visible to leaders and admins only.';
  end if;
  return query
  select pr.id, pr.full_name, pr.voice_part, pr.title, pr.role, pr.phone, pr.email
  from public.profiles pr
  where pr.status = 'active'
  order by case lower(coalesce(pr.voice_part, ''))
             when 'soprano' then 1
             when 'alto' then 2
             when 'tenor' then 3
             when 'bass' then 4
             else 5 end,
           pr.full_name;
end;
$$;

grant execute on function public.directory() to authenticated;
grant execute on function public.directory_full() to authenticated;

-- ------------------------------------------------------------
-- 5) UPDATE get_public_leaders to include avatar_url
-- ------------------------------------------------------------
create or replace function public.get_public_leaders()
returns table (id uuid, full_name text, voice_part text, title text, role text, avatar_url text)
language sql security definer set search_path = public
as $$
  select id, full_name, voice_part, title, role, avatar_url
  from public.profiles
  where role in ('leader','section_leader','admin') and status = 'active'
  order by case role when 'admin' then 0 when 'leader' then 1 else 2 end, full_name;
$$;

grant execute on function public.get_public_leaders() to anon, authenticated;
