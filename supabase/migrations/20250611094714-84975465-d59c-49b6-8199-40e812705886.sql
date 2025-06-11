
-- Check current policies on barc_form_submissions table
SELECT * FROM pg_policies WHERE tablename = 'barc_form_submissions';

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Anyone can submit BARC forms" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Form owners can view BARC submissions to their forms" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Service role can access all BARC submissions" ON public.barc_form_submissions;

-- Create proper RLS policies for BARC form submissions
-- Allow anyone (including anonymous users) to insert submissions
CREATE POLICY "Public can submit BARC forms"
  ON public.barc_form_submissions
  FOR INSERT
  WITH CHECK (true);

-- Allow form owners to view submissions to their forms
CREATE POLICY "Form owners can view their BARC submissions"
  ON public.barc_form_submissions
  FOR SELECT
  USING (
    form_slug IN (
      SELECT form_slug FROM public.public_submission_forms 
      WHERE user_id = auth.uid() AND form_type = 'barc'
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow service role full access for edge functions
CREATE POLICY "Service role full access to BARC submissions"
  ON public.barc_form_submissions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Allow form owners to update analysis results
CREATE POLICY "Form owners can update BARC submissions"
  ON public.barc_form_submissions
  FOR UPDATE
  USING (
    form_slug IN (
      SELECT form_slug FROM public.public_submission_forms 
      WHERE user_id = auth.uid() AND form_type = 'barc'
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );
