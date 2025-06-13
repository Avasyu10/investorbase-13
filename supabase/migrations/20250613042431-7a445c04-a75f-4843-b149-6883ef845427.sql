
-- Add user_id column to barc_form_submissions table
ALTER TABLE public.barc_form_submissions 
ADD COLUMN user_id uuid REFERENCES public.profiles(id);

-- Add an index for better query performance
CREATE INDEX idx_barc_form_submissions_user_id ON public.barc_form_submissions(user_id);

-- Add a comment to document the new column
COMMENT ON COLUMN public.barc_form_submissions.user_id IS 'References the IIT Bombay user who owns this submission';

-- Create RLS policies for barc_form_submissions
ALTER TABLE public.barc_form_submissions ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can view their own submissions, form owners can view submissions to their forms, admins can view all
CREATE POLICY "Users can view relevant submissions" ON public.barc_form_submissions
  FOR SELECT 
  TO authenticated
  USING (
    -- User owns the submission
    user_id = auth.uid()
    OR
    -- User owns the form that this submission was made to
    form_slug IN (
      SELECT form_slug FROM public.public_submission_forms 
      WHERE user_id = auth.uid()
    )
    OR 
    -- User is admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy for INSERT: Allow anyone (including anonymous users) to insert, but only IIT Bombay users get user_id set
CREATE POLICY "Enable insert for all users" ON public.barc_form_submissions
  FOR INSERT 
  WITH CHECK (true);

-- Policy for UPDATE: Only form owners and admins can update
CREATE POLICY "Form owners and admins can update" ON public.barc_form_submissions
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

-- Policy for service role (for analysis functions)
CREATE POLICY "Enable all for service role" ON public.barc_form_submissions
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);
