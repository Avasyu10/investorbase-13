
-- First, let's check and update the RLS policies for companies table
-- Enable RLS on companies table if not already enabled
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can access their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can access companies from their reports" ON public.companies;
DROP POLICY IF EXISTS "Service role can access all companies" ON public.companies;

-- Create comprehensive RLS policies for companies table
-- Policy 1: Users can access companies they own
CREATE POLICY "Users can access their own companies"
  ON public.companies
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 2: Service role (edge functions) can access all companies
CREATE POLICY "Service role can access all companies"
  ON public.companies
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Policy 3: Users can access companies from reports they have access to
CREATE POLICY "Users can access companies from accessible reports"
  ON public.companies
  FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM public.reports 
      WHERE user_id = auth.uid() OR is_public_submission = true
    )
  );

-- Also ensure company_details table has proper RLS
ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;

-- Drop and recreate company_details policies
DROP POLICY IF EXISTS "Users can access details of their companies" ON public.company_details;

CREATE POLICY "Users can access details of their companies"
  ON public.company_details
  FOR ALL
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE user_id = auth.uid()
      OR report_id IN (
        SELECT id FROM public.reports 
        WHERE user_id = auth.uid() OR is_public_submission = true
      )
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE user_id = auth.uid()
      OR report_id IN (
        SELECT id FROM public.reports 
        WHERE user_id = auth.uid() OR is_public_submission = true
      )
    )
  );

-- Ensure sections table has proper RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Drop and recreate sections policies
DROP POLICY IF EXISTS "Users can access sections of their companies" ON public.sections;

CREATE POLICY "Users can access sections of their companies"
  ON public.sections
  FOR ALL
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE user_id = auth.uid()
      OR report_id IN (
        SELECT id FROM public.reports 
        WHERE user_id = auth.uid() OR is_public_submission = true
      )
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE user_id = auth.uid()
      OR report_id IN (
        SELECT id FROM public.reports 
        WHERE user_id = auth.uid() OR is_public_submission = true
      )
    )
  );
