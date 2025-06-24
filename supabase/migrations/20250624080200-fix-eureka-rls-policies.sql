
-- First, ensure the user_id column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'eureka_form_submissions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.eureka_form_submissions 
        ADD COLUMN user_id UUID REFERENCES auth.users(id);
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_eureka_submissions_user_id 
        ON public.eureka_form_submissions(user_id);
    END IF;
END $$;

-- Disable RLS temporarily to clear any issues
ALTER TABLE public.eureka_form_submissions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Users can create eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Admins can view all eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.eureka_form_submissions;

-- Re-enable RLS
ALTER TABLE public.eureka_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create new, simpler RLS policies that allow anonymous submissions
CREATE POLICY "Allow anonymous and authenticated submissions" 
    ON public.eureka_form_submissions 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Users can view submissions they created or admins can view all" 
    ON public.eureka_form_submissions 
    FOR SELECT 
    USING (
        -- Allow if user owns the submission
        (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        OR 
        -- Allow if it's an anonymous submission (user_id is null)
        (user_id IS NULL)
        OR
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        ))
    );

-- Create admin policy for full access
CREATE POLICY "Admins can manage all eureka submissions" 
    ON public.eureka_form_submissions 
    FOR ALL 
    USING (
        auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Enable realtime for eureka_form_submissions if not already enabled
DO $$
BEGIN
    -- Enable realtime
    ALTER publication supabase_realtime ADD TABLE public.eureka_form_submissions;
EXCEPTION
    WHEN duplicate_object THEN 
        -- Table already added to publication
        NULL;
END $$;
