
-- First, let's check and fix the RLS policies for barc_form_submissions
-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public can submit BARC forms" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Form owners can view their BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Service role full access to BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Form owners can update BARC submissions" ON public.barc_form_submissions;

-- Create a simple policy that allows anyone (including anonymous users) to insert
CREATE POLICY "Allow anonymous BARC form submissions"
  ON public.barc_form_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users to view submissions to their forms
CREATE POLICY "Users can view their BARC submissions"
  ON public.barc_form_submissions
  FOR SELECT
  TO authenticated
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

-- Allow service role full access
CREATE POLICY "Service role access to BARC submissions"
  ON public.barc_form_submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to update submissions (for analysis results)
CREATE POLICY "Users can update their BARC submissions"
  ON public.barc_form_submissions
  FOR UPDATE
  TO authenticated, service_role
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
    OR
    auth.jwt() ->> 'role' = 'service_role'
  );
