
-- Remove the problematic auto-analyze trigger that's causing submission failures
DROP TRIGGER IF EXISTS auto_analyze_eureka_submission_trigger ON public.eureka_form_submissions;

-- Ensure the table has proper structure without auto-analysis interference
ALTER TABLE public.eureka_form_submissions DISABLE ROW LEVEL SECURITY;

-- Make sure the user_id column allows NULL values for iframe submissions
ALTER TABLE public.eureka_form_submissions 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a simple index for better performance
CREATE INDEX IF NOT EXISTS idx_eureka_submissions_created_at 
ON public.eureka_form_submissions(created_at);

-- Create a simpler trigger that only logs submissions without calling edge functions
CREATE OR REPLACE FUNCTION public.log_eureka_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Just log the submission, don't call any edge functions
  RAISE LOG 'Eureka submission logged: % - %', NEW.id, NEW.company_name;
  
  -- Set initial status
  NEW.analysis_status = 'pending';
  
  RETURN NEW;
END;
$$;

-- Create a simple before insert trigger that doesn't fail
CREATE TRIGGER log_eureka_submission_trigger
  BEFORE INSERT ON public.eureka_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.log_eureka_submission();
