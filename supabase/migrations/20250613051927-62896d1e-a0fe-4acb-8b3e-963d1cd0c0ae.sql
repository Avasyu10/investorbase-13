
-- First, let's check the current RLS policies and fix them
-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "IIT Bombay users can view relevant submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable insert for public submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "IIT Bombay form owners can update" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable all for service role" ON public.barc_form_submissions;

-- Create a more restrictive policy for viewing submissions
-- Only IIT Bombay users who own the form can see submissions to their forms
CREATE POLICY "IIT Bombay users can view submissions to their forms only" ON public.barc_form_submissions
  FOR SELECT 
  TO authenticated
  USING (
    -- User must be IIT Bombay user
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_iitbombay = true
    )
    AND (
      -- User owns the form that this submission was made to
      form_slug IN (
        SELECT form_slug FROM public.public_submission_forms 
        WHERE user_id = auth.uid() AND form_type = 'barc'
      )
      OR 
      -- User is admin (additional safety)
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- Allow anyone to insert (public form submissions)
CREATE POLICY "Anyone can submit to BARC forms" ON public.barc_form_submissions
  FOR INSERT 
  WITH CHECK (true);

-- Only IIT Bombay form owners and admins can update
CREATE POLICY "IIT Bombay form owners can update submissions" ON public.barc_form_submissions
  FOR UPDATE 
  TO authenticated
  USING (
    -- User must be IIT Bombay user
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_iitbombay = true
    )
    AND (
      form_slug IN (
        SELECT form_slug FROM public.public_submission_forms 
        WHERE user_id = auth.uid() AND form_type = 'barc'
      )
      OR 
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- Service role access (for edge functions)
CREATE POLICY "Service role can manage BARC submissions" ON public.barc_form_submissions
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.barc_form_submissions ENABLE ROW LEVEL SECURITY;
