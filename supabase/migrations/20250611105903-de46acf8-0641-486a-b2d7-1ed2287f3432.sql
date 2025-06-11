
-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow anonymous BARC form submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow viewing BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow updating BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow service role full access to BARC submissions" ON public.barc_form_submissions;

-- Allow anyone (including anonymous users) to insert BARC submissions
CREATE POLICY "Enable insert for anonymous users" ON public.barc_form_submissions
  FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated users to view submissions based on email or admin status
CREATE POLICY "Enable select for authenticated users" ON public.barc_form_submissions
  FOR SELECT TO authenticated USING (
    -- Admin users can see all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR 
    -- Users can see submissions with their email
    submitter_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow authenticated users to update submissions
CREATE POLICY "Enable update for authenticated users" ON public.barc_form_submissions
  FOR UPDATE TO authenticated USING (
    -- Admin users can update all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR 
    -- Users can update submissions with their email
    submitter_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) WITH CHECK (
    -- Admin users can update all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR 
    -- Users can update submissions with their email
    submitter_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow service role full access for analysis functions
CREATE POLICY "Enable all for service role" ON public.barc_form_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
