-- ============================================================
-- ROLE-SPECIFIC LEADER WORKSPACES — run ONCE (safe to re-run)
-- Each leadership role gets its own structured workspace.
-- Columns shared across record types are nullable; the portal
-- validates what each record type actually needs.
-- ============================================================

-- ------------------------------------------------------------
-- 0) UPGRADE PATH — patches tables created by the first draft
--    of this file (no-ops on a fresh install). Each block is
--    skipped when its table does not exist yet.
-- ------------------------------------------------------------
do $$ begin
  alter table public.chairperson_workspace
    alter column meeting_title drop not null,
    alter column meeting_date drop not null;
  alter table public.chairperson_workspace add column if not exists record_type text;
  if not exists (select 1 from pg_constraint where conname = 'chairperson_workspace_record_type_check') then
    update public.chairperson_workspace set record_type = 'meeting' where record_type is null;
    alter table public.chairperson_workspace
      alter column record_type set not null,
      add constraint chairperson_workspace_record_type_check
        check (record_type in ('meeting', 'appointment', 'document'));
  end if;
exception when undefined_table then null; end $$;

do $$ begin
  alter table public.choirmaster_workspace alter column rehearsal_date drop not null;
exception when undefined_table then null; end $$;

do $$ begin
  alter table public.secretary_workspace alter column meeting_date drop not null;
exception when undefined_table then null; end $$;

do $$ begin
  alter table public.asst_secretary_workspace
    alter column meeting_date drop not null,
    alter column support_role drop not null;
exception when undefined_table then null; end $$;

do $$ begin
  alter table public.treasurer_workspace
    alter column semester drop not null,
    alter column report_date drop not null,
    alter column transaction_date drop not null,
    alter column amount drop not null,
    alter column description drop not null;
exception when undefined_table then null; end $$;

do $$ begin
  alter table public.subcommittee_workspace add column if not exists event_title text;
exception when undefined_table then null; end $$;

-- ------------------------------------------------------------
-- 1) CHAIRPERSON WORKSPACE (Mwenyekiti)
-- ------------------------------------------------------------
create table if not exists public.chairperson_workspace (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  -- Meeting Management
  meeting_title text,
  meeting_date date,
  meeting_type text check (meeting_type in ('executive', 'general_assembly', 'sub_committee', 'other')),
  agenda text not null default '',
  minutes text not null default '',
  attendees text not null default '',
  action_items text not null default '',
  -- Sub-committee Appointments
  committee_name text,
  appointee_name text,
  appointment_date date,
  appointment_letter_url text,
  -- Bank & Official Documents
  document_type text check (document_type in ('bank_signatory', 'official_letter', 'authorization', 'other')),
  document_title text,
  document_file_url text,
  document_date date,
  -- General
  record_type text not null check (record_type in ('meeting', 'appointment', 'document')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chairperson_workspace enable row level security;

drop policy if exists "chairperson manages own workspace" on public.chairperson_workspace;
drop policy if exists "admins read all chairperson workspace" on public.chairperson_workspace;

create policy "chairperson manages own workspace" on public.chairperson_workspace
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "admins read all chairperson workspace" on public.chairperson_workspace
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

grant select, insert, update, delete on public.chairperson_workspace to authenticated;

-- ------------------------------------------------------------
-- 2) CHOIR MASTER WORKSPACE (Mwalimu Mkuu)
-- ------------------------------------------------------------
create table if not exists public.choirmaster_workspace (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  -- Rehearsal Planning
  rehearsal_date date,
  rehearsal_time time,
  venue text,
  pieces_practiced text not null default '', -- song titles
  focus_areas text, -- vocal technique, harmony, dynamics, etc.
  attendance_count integer,
  notes text,
  -- Song Repertoire
  song_title text,
  composer text,
  arrangement text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  status_repertoire text check (status_repertoire in ('learning', 'polishing', 'performance_ready', 'archived')),
  -- Ministry Calendar
  event_date date,
  event_title text,
  event_type text check (event_type in ('mass', 'concert', 'wedding', 'funeral', 'festival', 'rehearsal', 'other')),
  event_venue text,
  preparation_notes text,
  -- Assistant Appointments
  assistant_name text,
  assistant_role text,
  appointment_date date,
  -- General
  record_type text not null check (record_type in ('rehearsal', 'repertoire', 'event', 'assistant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.choirmaster_workspace enable row level security;

drop policy if exists "choirmaster manages own workspace" on public.choirmaster_workspace;
drop policy if exists "admins read all choirmaster workspace" on public.choirmaster_workspace;

create policy "choirmaster manages own workspace" on public.choirmaster_workspace
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "admins read all choirmaster workspace" on public.choirmaster_workspace
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

grant select, insert, update, delete on public.choirmaster_workspace to authenticated;

-- ------------------------------------------------------------
-- 3) SECRETARY WORKSPACE (Katibu)
-- ------------------------------------------------------------
create table if not exists public.secretary_workspace (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  -- Meeting Minutes
  meeting_date date,
  meeting_type text check (meeting_type in ('executive', 'general', 'sub_committee', 'annual_general', 'other')),
  attendees text not null default '',
  apologies text,
  minutes_text text not null default '',
  matters_arising text,
  decisions_made text not null default '',
  action_items text not null default '',
  next_meeting_date date,
  -- Asset Register
  asset_name text,
  asset_category text check (asset_category in ('instruments', 'sound_equipment', 'furniture', 'vestments', 'documents', 'other')),
  asset_condition text check (asset_condition in ('excellent', 'good', 'fair', 'needs_repair', 'disposed')),
  asset_location text,
  asset_value numeric(12,2),
  acquisition_date date,
  -- Correspondence Log
  correspondence_date date,
  correspondence_type text check (correspondence_type in ('incoming', 'outgoing', 'internal')),
  from_to text,
  subject text,
  reference_number text,
  file_url text,
  -- Membership Records
  member_name text,
  member_role text,
  membership_date date,
  membership_status text check (membership_status in ('active', 'on_leave', 'resigned', 'suspended')),
  -- General
  record_type text not null check (record_type in ('minutes', 'asset', 'correspondence', 'membership')),
  status text not null default 'draft' check (status in ('draft', 'final', 'distributed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.secretary_workspace enable row level security;

drop policy if exists "secretary manages own workspace" on public.secretary_workspace;
drop policy if exists "admins read all secretary workspace" on public.secretary_workspace;

create policy "secretary manages own workspace" on public.secretary_workspace
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "admins read all secretary workspace" on public.secretary_workspace
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

grant select, insert, update, delete on public.secretary_workspace to authenticated;

-- ------------------------------------------------------------
-- 4) ASSISTANT SECRETARY WORKSPACE (Katibu Msaidizi)
-- ------------------------------------------------------------
create table if not exists public.asst_secretary_workspace (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  -- Meeting Support
  meeting_date date,
  meeting_type text check (meeting_type in ('executive', 'general', 'sub_committee', 'other')),
  support_role text check (support_role in ('minutes_draft', 'attendance', 'documents_prep', 'distribution', 'other')),
  draft_minutes text,
  documents_prepared text,
  distribution_list text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'reviewed')),
  -- Backup Minutes (when Secretary absent)
  is_backup boolean not null default false,
  backup_for_date date,
  backup_minutes text,
  -- Communication Drafts
  comm_type text check (comm_type in ('letter', 'email', 'notice', 'announcement', 'other')),
  comm_draft text,
  comm_recipients text,
  comm_status text check (comm_status in ('draft', 'ready_to_send', 'sent')),
  -- General
  record_type text not null check (record_type in ('meeting_support', 'backup_minutes', 'communication')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.asst_secretary_workspace enable row level security;

drop policy if exists "asst_secretary manages own workspace" on public.asst_secretary_workspace;
drop policy if exists "admins read all asst_secretary workspace" on public.asst_secretary_workspace;

create policy "asst_secretary manages own workspace" on public.asst_secretary_workspace
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "admins read all asst_secretary workspace" on public.asst_secretary_workspace
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

grant select, insert, update, delete on public.asst_secretary_workspace to authenticated;

-- ------------------------------------------------------------
-- 5) TREASURER WORKSPACE (Mtunza Hazina)
-- ------------------------------------------------------------
create table if not exists public.treasurer_workspace (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  -- Financial Reports (per semester)
  semester text, -- e.g., '2026-1', '2026-2'
  report_date date,
  total_income numeric(12,2),
  total_expenses numeric(12,2),
  balance_brought_forward numeric(12,2),
  balance_carried_forward numeric(12,2),
  report_file_url text,
  report_status text not null default 'draft' check (report_status in ('draft', 'submitted', 'approved', 'presented')),
  -- Bank Transactions
  transaction_date date,
  transaction_type text check (transaction_type in ('deposit', 'withdrawal', 'transfer', 'fee', 'interest')),
  amount numeric(12,2),
  description text,
  reference_number text,
  bank_statement_ref text,
  -- Contributions Received
  contributor_name text,
  contributor_type text check (contributor_type in ('member', 'donor', 'fundraising', 'parish', 'other')),
  contribution_amount numeric(12,2),
  contribution_date date,
  contribution_method text check (contribution_method in ('cash', 'mobile_money', 'bank_transfer', 'cheque', 'other')),
  receipt_number text,
  -- Expenses
  expense_category text check (expense_category in ('instruments', 'vestments', 'transport', 'venue', 'meals', 'stationery', 'maintenance', 'utilities', 'honoraria', 'other')),
  expense_description text,
  expense_amount numeric(12,2),
  expense_date date,
  payee text,
  invoice_receipt_url text,
  approved_by text,
  -- General
  record_type text not null check (record_type in ('semester_report', 'transaction', 'contribution', 'expense')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.treasurer_workspace enable row level security;

drop policy if exists "treasurer manages own workspace" on public.treasurer_workspace;
drop policy if exists "admins read all treasurer workspace" on public.treasurer_workspace;

create policy "treasurer manages own workspace" on public.treasurer_workspace
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "admins read all treasurer workspace" on public.treasurer_workspace
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

grant select, insert, update, delete on public.treasurer_workspace to authenticated;

-- ------------------------------------------------------------
-- 6) SUB-COMMITTEE WORKSPACES (shared structure, filtered by committee)
-- ------------------------------------------------------------
create table if not exists public.subcommittee_workspace (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  committee_name text not null check (committee_name in ('nidhamu', 'liturujia', 'media', 'kijamii')),
  -- Committee Meetings
  meeting_date date,
  meeting_venue text,
  attendees text,
  agenda text,
  minutes text,
  matters_arising text,
  decisions text,
  action_items text,
  next_meeting_date date,
  -- Activity Reports
  activity_date date,
  activity_title text,
  activity_description text,
  participants_count integer,
  outcome text,
  challenges text,
  recommendations text,
  -- Member Issues (for Nidhamu)
  member_name text,
  issue_type text check (issue_type in ('attendance', 'conduct', 'uniform', 'conflict', 'other')),
  issue_description text,
  resolution text,
  follow_up_date date,
  -- Liturgy Plans (for Liturujia)
  liturgy_date date,
  liturgy_type text check (liturgy_type in ('sunday_mass', 'feast_day', 'wedding', 'funeral', 'special', 'other')),
  readings text,
  songs_selected text,
  special_notes text,
  -- Media Content (for Media)
  media_type text check (media_type in ('photo', 'video', 'audio', 'livestream', 'social_post', 'website_update', 'other')),
  media_title text,
  media_description text,
  media_file_url text,
  platform text,
  publish_date date,
  -- Social Affairs (for Kijamii)
  event_title text,
  event_description text,
  event_date date,
  beneficiaries text,
  budget_allocated numeric(12,2),
  budget_spent numeric(12,2),
  -- General
  record_type text not null check (record_type in ('meeting', 'activity', 'member_issue', 'liturgy', 'media', 'social_event')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subcommittee_workspace enable row level security;

drop policy if exists "subcommittee member manages own records" on public.subcommittee_workspace;
drop policy if exists "leaders read all subcommittee records" on public.subcommittee_workspace;
drop policy if exists "chairperson reads all subcommittee records" on public.subcommittee_workspace;
drop policy if exists "admins read all subcommittee workspace" on public.subcommittee_workspace;

create policy "subcommittee member manages own records" on public.subcommittee_workspace
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "leaders read all subcommittee records" on public.subcommittee_workspace
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'leader')
      and status = 'active'
    )
  );

create policy "admins read all subcommittee workspace" on public.subcommittee_workspace
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

grant select, insert, update, delete on public.subcommittee_workspace to authenticated;

-- ------------------------------------------------------------
-- 7) FUNCTION: Get workspace summary for current user based on role
-- ------------------------------------------------------------
create or replace function public.get_my_workspace()
returns table (
  workspace_type text,
  record_id bigint,
  title text,
  record_date date,
  status text,
  created_at timestamptz
)
language sql security definer set search_path = public
as $$
  -- Chairperson
  select 'chairperson', id,
    case when record_type = 'meeting' then 'Meeting: ' || coalesce(meeting_title, '')
         when record_type = 'appointment' then 'Appointment: ' || coalesce(committee_name, '') || ' — ' || coalesce(appointee_name, '')
         when record_type = 'document' then 'Document: ' || coalesce(document_title, '')
         else 'Record' end,
    case when record_type = 'meeting' then meeting_date
         when record_type = 'appointment' then appointment_date
         when record_type = 'document' then document_date
         else null end,
    status, created_at
  from public.chairperson_workspace
  where owner_id = auth.uid()

  union all

  -- Choir Master
  select 'choirmaster', id,
    case when record_type = 'rehearsal' then 'Rehearsal: ' || pieces_practiced
         when record_type = 'repertoire' then 'Song: ' || song_title
         when record_type = 'event' then 'Event: ' || event_title
         when record_type = 'assistant' then 'Assistant: ' || assistant_name
         else 'Record' end,
    case when record_type = 'rehearsal' then rehearsal_date
         when record_type = 'repertoire' then null
         when record_type = 'event' then event_date
         when record_type = 'assistant' then appointment_date
         else null end,
    'active', created_at
  from public.choirmaster_workspace
  where owner_id = auth.uid()

  union all

  -- Secretary
  select 'secretary', id,
    case when record_type = 'minutes' then 'Minutes: ' || coalesce(meeting_type, '') || ' — ' || coalesce(meeting_date::text, '')
         when record_type = 'asset' then 'Asset: ' || asset_name
         when record_type = 'correspondence' then 'Correspondence: ' || subject
         when record_type = 'membership' then 'Member: ' || member_name
         else 'Record' end,
    case when record_type = 'minutes' then meeting_date
         when record_type = 'asset' then acquisition_date
         when record_type = 'correspondence' then correspondence_date
         when record_type = 'membership' then membership_date
         else null end,
    status, created_at
  from public.secretary_workspace
  where owner_id = auth.uid()

  union all

  -- Assistant Secretary
  select 'asst_secretary', id,
    case when record_type = 'meeting_support' then 'Support: ' || coalesce(support_role, '') || ' — ' || coalesce(meeting_date::text, '')
         when record_type = 'backup_minutes' then 'Backup minutes: ' || coalesce(backup_for_date::text, '')
         when record_type = 'communication' then 'Communication: ' || coalesce(comm_type, '')
         else 'Record' end,
    case when record_type = 'backup_minutes' then backup_for_date
         else meeting_date end,
    status, created_at
  from public.asst_secretary_workspace
  where owner_id = auth.uid()

  union all

  -- Treasurer
  select 'treasurer', id,
    case when record_type = 'semester_report' then 'Report: ' || coalesce(semester, '')
         when record_type = 'transaction' then 'Transaction: ' || coalesce(description, '')
         when record_type = 'contribution' then 'Contribution: ' || coalesce(contributor_name, '')
         when record_type = 'expense' then 'Expense: ' || coalesce(expense_description, '')
         else 'Record' end,
    case when record_type = 'semester_report' then report_date
         when record_type = 'transaction' then transaction_date
         when record_type = 'contribution' then contribution_date
         when record_type = 'expense' then expense_date
         else null end,
    case when record_type = 'semester_report' then report_status else 'active' end, created_at
  from public.treasurer_workspace
  where owner_id = auth.uid()

  union all

  -- Sub-committee
  select 'subcommittee', id,
    case when record_type = 'meeting' then initcap(committee_name) || ' Meeting: ' || coalesce(meeting_date::text, '')
         when record_type = 'activity' then initcap(committee_name) || ' Activity: ' || activity_title
         when record_type = 'member_issue' then initcap(committee_name) || ' Issue: ' || member_name
         when record_type = 'liturgy' then 'Liturgy: ' || coalesce(liturgy_type, '') || ' — ' || coalesce(liturgy_date::text, '')
         when record_type = 'media' then 'Media: ' || media_title
         when record_type = 'social_event' then 'Social: ' || coalesce(event_title, event_description)
         else 'Record' end,
    case when record_type = 'meeting' then meeting_date
         when record_type = 'activity' then activity_date
         when record_type = 'member_issue' then follow_up_date
         when record_type = 'liturgy' then liturgy_date
         when record_type = 'media' then publish_date
         when record_type = 'social_event' then event_date
         else null end,
    status, created_at
  from public.subcommittee_workspace
  where owner_id = auth.uid()

  order by created_at desc;
$$;

grant execute on function public.get_my_workspace() to authenticated;

-- ------------------------------------------------------------
-- 8) Update leader_records to be the generic fallback (optional)
-- ------------------------------------------------------------
-- Keep existing leader_records table for backward compatibility
-- and for any leader who doesn't fit the specific roles above.
