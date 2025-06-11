
-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can submit to BARC forms" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Users can view BARC submissions to their forms" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Users can update BARC submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Service role can manage BARC submissions" ON public.barc_form_submissions;

-- Create simple policies that don't access auth.users table
-- Allow anyone (including anonymous users) to insert BARC submissions
CREATE POLICY "Anyone can submit to BARC forms" ON public.barc_form_submissions
  FOR INSERT 
  TO public
  WITH CHECK (true);

-- Allow authenticated users to view submissions to forms they own or if they're admin
CREATE POLICY "Users can view BARC submissions to their forms" ON public.barc_form_submissions
  FOR SELECT 
  TO authenticated
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
  );

-- Allow authenticated users to update submissions to forms they own or if they're admin
CREATE POLICY "Users can update BARC submissions" ON public.barc_form_submissions
  FOR UPDATE 
  TO authenticated
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
  );

-- Allow service role full access for analysis functions
CREATE POLICY "Service role can manage BARC submissions" ON public.barc_form_submissions
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);
