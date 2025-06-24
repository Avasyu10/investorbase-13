
-- Check if user_id column exists in eureka_form_submissions table and add it if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eureka_form_submissions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.eureka_form_submissions 
        ADD COLUMN user_id UUID REFERENCES auth.users(id);
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_eureka_submissions_user_id 
        ON public.eureka_form_submissions(user_id);
    END IF;
END $$;

-- Add RLS policies for eureka_form_submissions if they don't exist
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE public.eureka_form_submissions ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist to recreate them
    DROP POLICY IF EXISTS "Users can view their own eureka submissions" ON public.eureka_form_submissions;
    DROP POLICY IF EXISTS "Users can create eureka submissions" ON public.eureka_form_submissions;
    DROP POLICY IF EXISTS "Admins can view all eureka submissions" ON public.eureka_form_submissions;
    
    -- Create policies for user access
    CREATE POLICY "Users can view their own eureka submissions" 
        ON public.eureka_form_submissions 
        FOR SELECT 
        USING (auth.uid() = user_id OR user_id IS NULL);
    
    CREATE POLICY "Users can create eureka submissions" 
        ON public.eureka_form_submissions 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    
    -- Admin access policy
    CREATE POLICY "Admins can view all eureka submissions" 
        ON public.eureka_form_submissions 
        FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND is_admin = true
            )
        );
END $$;
