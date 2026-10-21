-- ============================================================
-- FIX — missing private 'library' storage bucket.
--
-- The live Supabase project was missing the 'library' bucket, so
-- music-library uploads / signed-URL downloads failed with
-- "NoSuchBucket" (see members.js — storage.from('library')).
--
-- Run this ONCE in Supabase → SQL Editor. Safe to re-run.
-- Requires: public.profiles (already present).
-- ============================================================

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