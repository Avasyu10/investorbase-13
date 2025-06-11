
-- Fix infinite recursion in RLS policies by creating security definer functions

-- First, create a security definer function to check user permissions for reports
CREATE OR REPLACE FUNCTION public.can_access_report(report_user_id uuid, report_is_public boolean, report_submitter_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (
    -- User owns the report
    report_user_id = auth.uid() 
    OR 
    -- Report is a public submission and user has access
    (report_is_public = true AND (
      -- User's email matches submitter_email
      report_submitter_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      OR
      -- User is admin
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
      )
    ))
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );
$$;

-- Create a security definer function to check user permissions for companies
CREATE OR REPLACE FUNCTION public.can_access_company(company_user_id uuid, company_report_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (
    -- User owns the company
    company_user_id = auth.uid() 
    OR 
    -- Company is from a report that the user has access to
    (company_report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = company_report_id 
      AND public.can_access_report(r.user_id, r.is_public_submission, r.submitter_email)
    ))
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their companies and public submissions" ON public.companies;
DROP POLICY IF EXISTS "Users can view their reports and public submissions" ON public.reports;

-- Create new policies using the security definer functions
CREATE POLICY "Users can view accessible companies" 
ON public.companies 
FOR SELECT 
USING (public.can_access_company(user_id, report_id));

CREATE POLICY "Users can view accessible reports" 
ON public.reports 
FOR SELECT 
USING (public.can_access_report(user_id, is_public_submission, submitter_email));

-- Fix sections and section_details policies to use the new functions
DROP POLICY IF EXISTS "Users can view sections of their companies" ON public.sections;
CREATE POLICY "Users can view sections of accessible companies" 
ON public.sections 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = sections.company_id 
    AND public.can_access_company(c.user_id, c.report_id)
  )
);

DROP POLICY IF EXISTS "Users can view section details of their companies" ON public.section_details;
CREATE POLICY "Users can view section details of accessible companies" 
ON public.section_details 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.companies c ON s.company_id = c.id
    WHERE s.id = section_details.section_id
    AND public.can_access_company(c.user_id, c.report_id)
  )
);
