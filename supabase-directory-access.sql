-- ============================================================
-- 1) Directory Access Control
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_view_directory boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.admin_set_directory_access(p_email text, p_access boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admins only.';
  END IF;

  UPDATE profiles
  SET can_view_directory = p_access
  WHERE email = p_email;
END;
$$;

-- ============================================================
-- 2) Update directory_full RPC to enforce access control
-- ============================================================

CREATE OR REPLACE FUNCTION public.directory_full()
RETURNS TABLE (
  member_id uuid, full_name text, voice_part text, title text, role text,
  phone text, email text
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND (role = 'admin' OR can_view_directory = true)
  ) THEN
    RAISE EXCEPTION 'Contact details are visible to admins and designated leaders only.';
  END IF;

  RETURN QUERY
  SELECT pr.id, pr.full_name, pr.voice_part, pr.title, pr.role, pr.phone, pr.email
  FROM public.profiles pr
  WHERE pr.status = 'active'
  ORDER BY CASE LOWER(COALESCE(pr.voice_part, ''))
    WHEN 'soprano' THEN 1
    WHEN 'alto' THEN 2
    WHEN 'tenor' THEN 3
    WHEN 'bass' THEN 4
    ELSE 5
  END, pr.full_name;
END;
$$;

-- ============================================================
-- 3) Add Katiba to Leader Resources
-- ============================================================

INSERT INTO public.resources (title, body, date, audience)
SELECT 'Katiba ya Kwaya ya Maranatha 2025',
       '<a href="assets/documents/Katiba_ya_Kwaya_ya_Maranatha_2025.pdf" target="_blank" class="mp-link">Pakua Katiba (PDF)</a>',
       TO_CHAR(NOW(), 'DD/MM/YYYY'),
       'leader'
WHERE NOT EXISTS (
  SELECT 1 FROM public.resources WHERE title = 'Katiba ya Kwaya ya Maranatha 2025'
);
