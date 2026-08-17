-- ============================================================
-- ADMIN: SET MEMBER TITLE — run ONCE (safe to re-run)
-- Lets the admin give a leader a public title (e.g. Chairperson)
-- shown on the team page. Admin-only, mirrors admin_set_role.
-- ============================================================

create or replace function public.admin_set_title(p_email text, p_title text)
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
    raise exception 'Only admins can change titles';
  end if;
  update public.profiles
    set title = nullif(trim(p_title), '')
    where email = lower(p_email);
  if not found then
    raise exception 'No profile with that email';
  end if;
end $$;

grant execute on function public.admin_set_title(text, text) to authenticated;