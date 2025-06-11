
-- Create a new table for the specific public form submissions
CREATE TABLE public.barc_form_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_slug text NOT NULL,
  company_name text NOT NULL,
  company_registration_type text NOT NULL,
  executive_summary text NOT NULL,
  company_type text NOT NULL,
  question_1 text,
  question_2 text,
  question_3 text,
  question_4 text,
  question_5 text,
  submitter_email text,
  report_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.barc_form_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert submissions (public form)
CREATE POLICY "Anyone can submit BARC forms"
  ON public.barc_form_submissions
  FOR INSERT
  WITH CHECK (true);

-- Allow form owners to view submissions to their forms
CREATE POLICY "Form owners can view BARC submissions to their forms"
  ON public.barc_form_submissions
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

-- Allow service role full access for edge functions
CREATE POLICY "Service role can access all BARC submissions"
  ON public.barc_form_submissions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Add form_type column to public_submission_forms to distinguish between form types
ALTER TABLE public.public_submission_forms 
ADD COLUMN form_type text NOT NULL DEFAULT 'general';

-- Update existing forms to have 'general' type
UPDATE public.public_submission_forms 
SET form_type = 'general' 
WHERE form_type IS NULL;
