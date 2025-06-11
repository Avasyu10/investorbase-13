
-- Fix RLS policies for companies table to allow proper access
DROP POLICY IF EXISTS "Users can view their companies and public submissions" ON public.companies;

CREATE POLICY "Users can view their companies and public submissions" 
ON public.companies 
FOR SELECT 
USING (
  -- User owns the company
  user_id = auth.uid() 
  OR 
  -- Company is from a report that the user has access to
  report_id IN (
    SELECT id FROM public.reports 
    WHERE user_id = auth.uid() 
    OR (is_public_submission = true AND user_id = auth.uid())
  )
  OR
  -- User is admin
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Add insert/update policies for companies if they don't exist
DROP POLICY IF EXISTS "Users can insert their own companies" ON public.companies;
CREATE POLICY "Users can insert their own companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;
CREATE POLICY "Users can update their own companies" 
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

-- Ensure reports table has proper RLS policies
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
    submitter_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  ))
  OR
  -- User has access through company ownership
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

-- Enable RLS on all necessary tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Add policies for sections table if missing
DROP POLICY IF EXISTS "Users can view sections of their companies" ON public.sections;
CREATE POLICY "Users can view sections of their companies" 
ON public.sections 
FOR SELECT 
USING (
  company_id IN (
    SELECT id FROM public.companies 
    WHERE user_id = auth.uid()
    OR report_id IN (
      SELECT id FROM public.reports 
      WHERE user_id = auth.uid() 
      OR (is_public_submission = true AND user_id = auth.uid())
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Add section_details policies if missing
ALTER TABLE public.section_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view section details of their companies" ON public.section_details;
CREATE POLICY "Users can view section details of their companies" 
ON public.section_details 
FOR SELECT 
USING (
  section_id IN (
    SELECT s.id FROM public.sections s
    JOIN public.companies c ON s.company_id = c.id
    WHERE c.user_id = auth.uid()
    OR c.report_id IN (
      SELECT id FROM public.reports 
      WHERE user_id = auth.uid() 
      OR (is_public_submission = true AND user_id = auth.uid())
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
