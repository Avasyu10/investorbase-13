
-- Drop all existing policies on barc_form_submissions to start completely fresh
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

-- Create a completely permissive policy for insertions (allowing all users including anonymous)
CREATE POLICY "Allow all insertions to BARC submissions"
  ON public.barc_form_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users to view submissions
CREATE POLICY "Allow authenticated view of BARC submissions"
  ON public.barc_form_submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access
CREATE POLICY "Service role full access to BARC submissions"
  ON public.barc_form_submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow updates for analysis (authenticated users and service role)
CREATE POLICY "Allow updates to BARC submissions"
  ON public.barc_form_submissions
  FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);
