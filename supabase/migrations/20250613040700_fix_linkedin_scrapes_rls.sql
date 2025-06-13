
-- Fix RLS policies for linkedin_profile_scrapes table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.linkedin_profile_scrapes;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.linkedin_profile_scrapes;
DROP POLICY IF EXISTS "Enable update for service role" ON public.linkedin_profile_scrapes;

-- Create comprehensive RLS policies for linkedin_profile_scrapes
CREATE POLICY "Enable read access for authenticated users" ON public.linkedin_profile_scrapes
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role and authenticated users" ON public.linkedin_profile_scrapes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for service role and authenticated users" ON public.linkedin_profile_scrapes
    FOR UPDATE USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.linkedin_profile_scrapes ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE public.linkedin_profile_scrapes IS 'Stores scraped LinkedIn profile data with permissive RLS for service operations';
