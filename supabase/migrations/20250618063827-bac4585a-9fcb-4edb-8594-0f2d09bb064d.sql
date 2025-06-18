
-- Create eureka_form_submissions table with the same structure as barc_form_submissions
CREATE TABLE public.eureka_form_submissions (
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
  submitter_email text NOT NULL,
  founder_linkedin_urls text[] DEFAULT '{}',
  poc_name text,
  phoneno text,
  company_linkedin_url text,
  user_id uuid,
  report_id uuid,
  company_id uuid,
  analysis_status text DEFAULT 'pending',
  analysis_result jsonb,
  analysis_error text,
  analyzed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the eureka form submissions table
ALTER TABLE public.eureka_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for eureka form submissions (same as barc_form_submissions)
CREATE POLICY "Allow all insertions to eureka submissions"
  ON public.eureka_form_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated view of eureka submissions"
  ON public.eureka_form_submissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to eureka submissions"
  ON public.eureka_form_submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow updates to eureka submissions"
  ON public.eureka_form_submissions
  FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Create trigger for updating the updated_at column
CREATE OR REPLACE FUNCTION update_eureka_submissions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_eureka_submissions_updated_at_trigger
  BEFORE UPDATE ON public.eureka_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_eureka_submissions_updated_at();
