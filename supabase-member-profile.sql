-- ============================================================
-- MEMBER PROFILE EXTENSION — run ONCE in the SQL editor
-- Adds personal profile fields: date of birth, study status,
-- university, graduation years and residence.
-- (phone and course_program columns already exist.)
-- ============================================================

alter table public.profiles add column if not exists dob date;

alter table public.profiles add column if not exists study_status text not null default ''
  check (study_status in ('', 'studying', 'alumni'));

alter table public.profiles add column if not exists university text not null default '';

alter table public.profiles add column if not exists expected_grad_year integer;

alter table public.profiles add column if not exists grad_year integer;

alter table public.profiles add column if not exists residence_type text not null default ''
  check (residence_type in ('', 'campus', 'off_campus'));

alter table public.profiles add column if not exists residence text not null default '';