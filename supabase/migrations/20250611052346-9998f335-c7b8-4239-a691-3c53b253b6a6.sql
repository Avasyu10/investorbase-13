
-- First, let's check if the public_submission_forms table has proper RLS policies
-- and ensure users can read public forms

-- Enable RLS on public_submission_forms if not already enabled
ALTER TABLE public.public_submission_forms ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow anyone to read active public submission forms
DROP POLICY IF EXISTS "Anyone can view active public submission forms" ON public.public_submission_forms;
CREATE POLICY "Anyone can view active public submission forms" 
ON public.public_submission_forms 
FOR SELECT 
USING (is_active = true);

-- Create a policy to allow users to manage their own forms
DROP POLICY IF EXISTS "Users can manage their own forms" ON public.public_submission_forms;
CREATE POLICY "Users can manage their own forms" 
ON public.public_submission_forms 
FOR ALL 
USING (auth.uid() = user_id);

-- Also ensure the public_form_submissions table allows inserts for public submissions
ALTER TABLE public.public_form_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert public form submissions
DROP POLICY IF EXISTS "Anyone can submit to public forms" ON public.public_form_submissions;
CREATE POLICY "Anyone can submit to public forms" 
ON public.public_form_submissions 
FOR INSERT 
WITH CHECK (true);

-- Allow users to view submissions to their own forms
DROP POLICY IF EXISTS "Users can view submissions to their forms" ON public.public_form_submissions;
CREATE POLICY "Users can view submissions to their forms" 
ON public.public_form_submissions 
FOR SELECT 
USING (
  form_slug IN (
    SELECT form_slug FROM public.public_submission_forms 
    WHERE user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Check if there are any existing forms and display them
SELECT 
  id,
  form_name,
  form_slug,
  is_active,
  created_at,
  user_id
FROM public.public_submission_forms 
ORDER BY created_at DESC;
