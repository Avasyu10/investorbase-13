
-- Drop all existing policies on barc_form_submissions to start fresh
DROP POLICY IF EXISTS "Allow anonymous BARC form submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Public can submit BARC forms" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Users can view their BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Form owners can view their BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Service role access to BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Service role full access to BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Users can update their BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Form owners can update BARC submissions" ON public.barc_form_submissions;

-- Create a simple, permissive policy for anonymous insertions
CREATE POLICY "Allow all BARC form submissions"
  ON public.barc_form_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users and service role to view submissions
CREATE POLICY "Allow viewing BARC submissions"
  ON public.barc_form_submissions
  FOR SELECT
  TO authenticated, service_role
  USING (true);

-- Allow service role and authenticated users to update for analysis
CREATE POLICY "Allow updating BARC submissions"
  ON public.barc_form_submissions
  FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Allow service role to delete if needed
CREATE POLICY "Allow service role to delete BARC submissions"
  ON public.barc_form_submissions
  FOR DELETE
  TO service_role
  USING (true);
