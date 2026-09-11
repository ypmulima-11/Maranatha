
DROP FUNCTION IF EXISTS public.get_public_leaders();

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
