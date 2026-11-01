-- ============================================================
-- MARANATHA CHOIR — Real-Time Push Notifications Setup
-- Where: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1) Ensure full row data is sent on real-time updates/inserts
alter table if exists public.announcements replica identity full;
alter table if exists public.events replica identity full;

-- 2) Add announcements and events to the supabase_realtime publication
--    so PostgreSQL INSERT events are pushed instantly to all connected devices.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;
