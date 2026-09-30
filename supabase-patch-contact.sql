ALTER TABLE public.contact_msgs ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

DROP POLICY IF EXISTS "admins update messages" ON public.contact_msgs;
CREATE POLICY "admins update messages" ON public.contact_msgs
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
