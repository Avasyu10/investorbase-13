
-- Fix RLS policies for iframe submissions
ALTER TABLE public.eureka_form_submissions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public insert on eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Allow public select on eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Allow service role all access" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Allow all users to insert eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Users can view their own eureka submissions or anonymous ones" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Admins can manage all eureka submissions" ON public.eureka_form_submissions;

-- Re-enable RLS
ALTER TABLE public.eureka_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies specifically for eureka submissions
CREATE POLICY "Allow unrestricted insert on eureka submissions" 
ON public.eureka_form_submissions 
FOR INSERT 
TO public, anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow unrestricted select on eureka submissions" 
ON public.eureka_form_submissions 
FOR SELECT 
TO public, anon, authenticated
USING (true);

-- Admin policy for management
CREATE POLICY "Allow service role full access" 
ON public.eureka_form_submissions 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);
