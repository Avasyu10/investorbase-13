
-- First, let's drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable insert for all users" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable all for service role" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.barc_form_submissions;

-- Create a simple policy that allows anyone (including anonymous users) to insert
CREATE POLICY "Allow public BARC form submissions" ON public.barc_form_submissions
  FOR INSERT TO public WITH CHECK (true);

-- Allow authenticated users and service role to select
CREATE POLICY "Allow authenticated users to view BARC submissions" ON public.barc_form_submissions
  FOR SELECT TO authenticated USING (true);

-- Allow service role full access for analysis functions
CREATE POLICY "Allow service role full access to BARC submissions" ON public.barc_form_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users to update for analysis results
CREATE POLICY "Allow authenticated users to update BARC submissions" ON public.barc_form_submissions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
