
-- First, let's check if the user_id column exists and fix any issues
DO $$
BEGIN
    -- Check if user_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'eureka_form_submissions' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.eureka_form_submissions 
        ADD COLUMN user_id UUID;
    END IF;
    
    -- Make sure user_id column allows NULL values for anonymous submissions
    ALTER TABLE public.eureka_form_submissions 
    ALTER COLUMN user_id DROP NOT NULL;
END $$;

-- Ensure RLS is disabled for anonymous submissions
ALTER TABLE public.eureka_form_submissions DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might interfere
DROP POLICY IF EXISTS "Allow anonymous inserts for public submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Users can view their own eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Users can update their own eureka submissions" ON public.eureka_form_submissions;

-- Ensure the trigger exists for auto-analysis
DROP TRIGGER IF EXISTS auto_analyze_eureka_trigger ON public.eureka_form_submissions;
CREATE TRIGGER auto_analyze_eureka_trigger
  AFTER INSERT ON public.eureka_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_analyze_eureka_submission();
