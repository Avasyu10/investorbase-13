
-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable all for service role" ON public.barc_form_submissions;

-- Create policies that mirror the working public_form_submissions table exactly
-- Allow anyone (including anonymous users) to insert BARC submissions
CREATE POLICY "Anyone can submit to BARC forms" ON public.barc_form_submissions
  FOR INSERT 
  WITH CHECK (true);

-- Allow users to view submissions to forms they own or if they're admin
CREATE POLICY "Users can view BARC submissions to their forms" ON public.barc_form_submissions
  FOR SELECT 
  USING (
    form_slug IN (
      SELECT form_slug FROM public.public_submission_forms 
      WHERE user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    submitter_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow authenticated users to update submissions
CREATE POLICY "Users can update BARC submissions" ON public.barc_form_submissions
  FOR UPDATE 
  USING (
    form_slug IN (
      SELECT form_slug FROM public.public_submission_forms 
      WHERE user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    submitter_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow service role full access for analysis functions
CREATE POLICY "Service role can manage BARC submissions" ON public.barc_form_submissions
  FOR ALL TO service_role 
  USING (true) 
  WITH CHECK (true);
