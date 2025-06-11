
-- Drop the existing barc_form_submissions table completely
DROP TABLE IF EXISTS public.barc_form_submissions CASCADE;

-- Recreate the table with the same structure but matching the working public_form_submissions pattern
CREATE TABLE public.barc_form_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_slug text NOT NULL,
  company_name text NOT NULL,
  company_registration_type text,
  executive_summary text,
  company_type text,
  question_1 text,
  question_2 text,
  question_3 text,
  question_4 text,
  question_5 text,
  submitter_email text,
  analysis_status text DEFAULT 'pending',
  analysis_result jsonb,
  analysis_error text,
  analyzed_at timestamp with time zone,
  report_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the table
ALTER TABLE public.barc_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create a simple INSERT policy that allows anyone (including anonymous users) to insert
-- This exactly matches how public_form_submissions works
CREATE POLICY "Enable insert for anonymous users" ON public.barc_form_submissions
  FOR INSERT 
  WITH CHECK (true);

-- Allow authenticated users to view submissions to forms they own or if they're admin
CREATE POLICY "Enable select for authenticated users" ON public.barc_form_submissions
  FOR SELECT 
  TO authenticated
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

-- Allow authenticated users to update submissions 
CREATE POLICY "Enable update for authenticated users" ON public.barc_form_submissions
  FOR UPDATE 
  TO authenticated
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

-- Allow service role full access for analysis functions
CREATE POLICY "Enable all for service role" ON public.barc_form_submissions
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_barc_submissions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_barc_form_submissions_updated_at
  BEFORE UPDATE ON public.barc_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_barc_submissions_updated_at();
