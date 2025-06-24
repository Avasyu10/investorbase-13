
-- Check if user_id column exists and add it if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'eureka_form_submissions' 
                   AND column_name = 'user_id') THEN
        ALTER TABLE public.eureka_form_submissions 
        ADD COLUMN user_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Ensure the table has proper structure
ALTER TABLE public.eureka_form_submissions 
ALTER COLUMN user_id DROP NOT NULL;

-- Remove all RLS policies completely to allow unrestricted access
ALTER TABLE public.eureka_form_submissions DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow all users to insert eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Users can view their own eureka submissions or anonymous ones" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Admins can manage all eureka submissions" ON public.eureka_form_submissions;

-- Create a simple insert-only policy for now
ALTER TABLE public.eureka_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on eureka submissions" 
ON public.eureka_form_submissions 
FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Allow public select on eureka submissions" 
ON public.eureka_form_submissions 
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Allow service role all access" 
ON public.eureka_form_submissions 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);
