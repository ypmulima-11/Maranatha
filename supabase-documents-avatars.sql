-- ============================================================
-- 1) Create AVATARS and DOCUMENTS storage buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true),
       ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars RLS
DROP POLICY IF EXISTS "public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "auth users upload avatars" ON storage.objects;

CREATE POLICY "public read avatars" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "auth users upload avatars" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "auth users update avatars" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Documents RLS
DROP POLICY IF EXISTS "public read documents" ON storage.objects;
DROP POLICY IF EXISTS "leaders upload documents" ON storage.objects;

CREATE POLICY "public read documents" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'documents');

CREATE POLICY "leaders upload documents" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('leader', 'section_leader', 'admin')
  )
);

-- ============================================================
-- 2) Update resources table RLS to allow leaders to post
-- ============================================================

DROP POLICY IF EXISTS "leaders insert resources" ON public.resources;

CREATE POLICY "leaders insert resources" ON public.resources
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  OR (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('leader', 'section_leader')
    AND audience = 'leader'
  )
);
