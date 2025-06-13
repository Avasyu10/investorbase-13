
-- First, let's properly implement RLS policies for barc_form_submissions
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant submissions" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Form owners and admins can update" ON public.barc_form_submissions;
DROP POLICY IF EXISTS "Enable all for service role" ON public.barc_form_submissions;

-- Create proper RLS policies for barc_form_submissions
-- Policy 1: IIT Bombay users can view submissions where they are the user_id OR form owner
CREATE POLICY "IIT Bombay users can view relevant submissions" ON public.barc_form_submissions
  FOR SELECT 
  TO authenticated
  USING (
    -- User must be IIT Bombay user
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_iitbombay = true
    )
    AND (
      -- User owns the submission (their user_id)
      user_id = auth.uid()
      OR
      -- User owns the form that this submission was made to
      form_slug IN (
        SELECT form_slug FROM public.public_submission_forms 
        WHERE user_id = auth.uid()
      )
      OR 
      -- User is admin (additional safety)
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- Policy 2: Allow anyone to insert (public form submissions), but only IIT Bombay users get user_id set
CREATE POLICY "Enable insert for public submissions" ON public.barc_form_submissions
  FOR INSERT 
  WITH CHECK (true);

-- Policy 3: Only IIT Bombay form owners and admins can update
CREATE POLICY "IIT Bombay form owners can update" ON public.barc_form_submissions
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
        WHERE user_id = auth.uid()
      )
      OR 
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- Policy 4: Service role access (for edge functions)
CREATE POLICY "Enable all for service role" ON public.barc_form_submissions
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.barc_form_submissions ENABLE ROW LEVEL SECURITY;
