
-- Disable RLS temporarily to clean up all policies
ALTER TABLE public.barc_form_submissions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies completely
DROP POLICY IF EXISTS "Allow all insertions to BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow authenticated view of BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Service role full access to BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow updates to BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow all BARC form submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow viewing BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow updating BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow service role to delete BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Allow anonymous BARC form submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Public can submit BARC forms" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Users can view their BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Form owners can view their BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Service role access to BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Service role full access to BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Users can update their BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Form owners can update BARC submissions" ON public.barc_form_submissions;

-- Re-enable RLS
ALTER TABLE public.barc_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create simple policies that mirror the working public_form_submissions table
-- Allow anyone (including anonymous) to insert
CREATE POLICY "Enable insert for all users" ON public.barc_form_submissions
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to select
CREATE POLICY "Enable select for authenticated users" ON public.barc_form_submissions
  FOR SELECT TO authenticated USING (true);

-- Allow service role full access
CREATE POLICY "Enable all for service role" ON public.barc_form_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow updates for authenticated users (for analysis)
CREATE POLICY "Enable update for authenticated users" ON public.barc_form_submissions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
