
-- First, let's check and fix RLS policies for email_pitch_submissions
-- Enable RLS if not already enabled
ALTER TABLE public.email_pitch_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Users can view email pitch submissions assigned to them" ON public.email_pitch_submissions;
DROP POLICY IF EXISTS "Allow public read access to email pitch submissions" ON public.email_pitch_submissions;

-- Create a policy that allows users to view email pitch submissions
-- Either submissions that match their email address OR all submissions if they're admin
CREATE POLICY "Users can view relevant email pitch submissions" 
ON public.email_pitch_submissions 
FOR SELECT 
USING (
  -- Allow if the sender_email matches the current user's email
  sender_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Allow if the user is an admin
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Also ensure reports table has proper RLS policies
DROP POLICY IF EXISTS "Users can view their reports and public submissions" ON public.reports;

CREATE POLICY "Users can view their reports and public submissions" 
ON public.reports 
FOR SELECT 
USING (
  -- User owns the report
  user_id = auth.uid() 
  OR 
  -- Report is a public submission and user has access
  (is_public_submission = true AND (
    -- User's email matches submitter_email
    submitter_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  ))
);

-- Add insert/update policies for reports if they don't exist
DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;
CREATE POLICY "Users can insert their own reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR is_public_submission = true);

DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
CREATE POLICY "Users can update their own reports" 
ON public.reports 
FOR UPDATE 
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
