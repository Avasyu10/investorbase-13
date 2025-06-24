
-- Ensure the eureka_form_submissions table has the user_id column
-- This migration will check if the column exists and add it if it doesn't

DO $$
BEGIN
    -- Check if the user_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'eureka_form_submissions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.eureka_form_submissions 
        ADD COLUMN user_id uuid REFERENCES auth.users(id);
        
        RAISE NOTICE 'Added user_id column to eureka_form_submissions table';
    ELSE
        RAISE NOTICE 'user_id column already exists in eureka_form_submissions table';
    END IF;

    -- Ensure the column allows NULL values for anonymous submissions
    ALTER TABLE public.eureka_form_submissions 
    ALTER COLUMN user_id DROP NOT NULL;

    -- Create index if it doesn't exist
    CREATE INDEX IF NOT EXISTS idx_eureka_submissions_user_id 
    ON public.eureka_form_submissions(user_id);

    -- Ensure RLS is properly configured
    ALTER TABLE public.eureka_form_submissions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "Allow unrestricted insert on eureka submissions" ON public.eureka_form_submissions;
    DROP POLICY IF EXISTS "Allow unrestricted select on eureka submissions" ON public.eureka_form_submissions;
    DROP POLICY IF EXISTS "Allow service role full access" ON public.eureka_form_submissions;

    -- Create permissive policies for eureka submissions
    CREATE POLICY "Allow all users to insert eureka submissions" 
    ON public.eureka_form_submissions 
    FOR INSERT 
    TO public, anon, authenticated
    WITH CHECK (true);

    CREATE POLICY "Allow all users to select eureka submissions" 
    ON public.eureka_form_submissions 
    FOR SELECT 
    TO public, anon, authenticated
    USING (true);

    -- Allow service role full access
    CREATE POLICY "Allow service role all operations" 
    ON public.eureka_form_submissions 
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'eureka_form_submissions' 
ORDER BY ordinal_position;

