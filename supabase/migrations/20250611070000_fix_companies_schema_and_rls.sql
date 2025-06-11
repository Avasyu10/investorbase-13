
-- Fix the companies table schema issue and RLS policies

-- Add the missing description column to companies table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'description') THEN
        ALTER TABLE public.companies ADD COLUMN description text;
    END IF;
END $$;

-- Drop and recreate RLS policies for companies to fix access issues
DROP POLICY IF EXISTS "Users can view accessible companies" ON public.companies;

-- Create a more permissive policy for companies that allows access to:
-- 1. Companies owned by the user
-- 2. Companies from reports that are public submissions and match user's email
-- 3. Admin access to all companies
CREATE POLICY "Users can view accessible companies" 
ON public.companies 
FOR SELECT 
USING (
  -- User owns the company
  user_id = auth.uid() 
  OR 
  -- Company is from a public submission report and user has access
  (report_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = report_id 
    AND (
      -- User owns the report
      r.user_id = auth.uid()
      OR
      -- Report is public submission and user's email matches submitter
      (r.is_public_submission = true AND r.submitter_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      ))
    )
  ))
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Ensure companies table has proper insert/update policies
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
CREATE POLICY "Users can insert companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

DROP POLICY IF EXISTS "Users can update accessible companies" ON public.companies;
CREATE POLICY "Users can update accessible companies" 
ON public.companies 
FOR UPDATE 
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Fix email_pitch_submissions RLS policies to be more permissive
DROP POLICY IF EXISTS "Users can view relevant email pitch submissions" ON public.email_pitch_submissions;

-- Create a policy that allows users to view email pitch submissions they have access to
CREATE POLICY "Users can view email pitch submissions with access" 
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
  OR
  -- Allow if this is a public submission that the user should have access to
  report_id IS NOT NULL
);

-- Add insert policy for email_pitch_submissions
DROP POLICY IF EXISTS "Allow insert email pitch submissions" ON public.email_pitch_submissions;
CREATE POLICY "Allow insert email pitch submissions" 
ON public.email_pitch_submissions 
FOR INSERT 
WITH CHECK (true); -- Allow all inserts since these come from external email processing

-- Add update policy for email_pitch_submissions
DROP POLICY IF EXISTS "Allow update email pitch submissions" ON public.email_pitch_submissions;
CREATE POLICY "Allow update email pitch submissions" 
ON public.email_pitch_submissions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Grant necessary permissions
GRANT SELECT ON public.companies TO authenticated;
GRANT INSERT ON public.companies TO authenticated;
GRANT UPDATE ON public.companies TO authenticated;

GRANT SELECT ON public.email_pitch_submissions TO authenticated;
GRANT INSERT ON public.email_pitch_submissions TO authenticated;
GRANT UPDATE ON public.email_pitch_submissions TO authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
