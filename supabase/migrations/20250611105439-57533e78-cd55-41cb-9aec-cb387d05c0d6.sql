
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow public BARC form submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow authenticated users to view BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow service role full access to BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow authenticated users to update BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable all for service role" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.barc_form_submissions;

-- Create simple policies that mirror the working public_form_submissions table
-- Allow anyone (including anonymous) to insert
CREATE POLICY "Allow anonymous BARC form submissions" ON public.barc_form_submissions
  FOR INSERT TO public WITH CHECK (true);

-- Allow authenticated users to select their own submissions or all if admin
CREATE POLICY "Allow viewing BARC submissions" ON public.barc_form_submissions
  FOR SELECT TO authenticated USING (
    -- Admin users can see all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR 
    -- Users can see submissions with their email
    submitter_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow authenticated users to update for analysis results
CREATE POLICY "Allow updating BARC submissions" ON public.barc_form_submissions
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
CREATE POLICY "Allow service role full access to BARC submissions" ON public.barc_form_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
