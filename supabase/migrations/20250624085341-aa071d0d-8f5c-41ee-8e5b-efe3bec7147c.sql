
-- Add the missing user_id column to eureka_form_submissions table
ALTER TABLE public.eureka_form_submissions 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_eureka_submissions_user_id 
ON public.eureka_form_submissions(user_id);

-- Make sure RLS is disabled (as you mentioned you removed all policies)
ALTER TABLE public.eureka_form_submissions DISABLE ROW LEVEL SECURITY;
