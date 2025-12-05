-- Create IIT Guwahati evaluations table for storing AI evaluations
CREATE TABLE public.iitguwahati_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES public.iitguwahati_form_submissions(id) ON DELETE CASCADE,
  startup_name text,
  
  -- Section 1: The Problem (Domain & Market Pain Point)
  problem_score integer DEFAULT 0,
  problem_feedback text,
  
  -- Section 2: The Solution (The Innovation)
  solution_score integer DEFAULT 0,
  solution_feedback text,
  
  -- Section 3: The Product (Tangible/Intangible Offering)
  product_score integer DEFAULT 0,
  product_feedback text,
  
  -- Section 4: Business Model (Path to Revenue Generation)
  business_model_score integer DEFAULT 0,
  business_model_feedback text,
  
  -- Section 5: Finances (Commercial Viability & Traction)
  finances_score integer DEFAULT 0,
  finances_feedback text,
  
  -- Section 6: Patents & Legalities (Competitive Moat & Funding Status)
  patents_legalities_score integer DEFAULT 0,
  patents_legalities_feedback text,
  
  -- Section 7: Future Goals (Vision & Roadmap)
  future_goals_score integer DEFAULT 0,
  future_goals_feedback text,
  
  -- Overall
  overall_score integer DEFAULT 0,
  overall_summary text,
  
  -- Metadata
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_iitguwahati_evaluations_submission_id ON public.iitguwahati_evaluations(submission_id);

-- Enable RLS
ALTER TABLE public.iitguwahati_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated view of IIT Guwahati evaluations"
  ON public.iitguwahati_evaluations
  FOR SELECT
  USING (true);

CREATE POLICY "Service role full access to IIT Guwahati evaluations"
  ON public.iitguwahati_evaluations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow insert to IIT Guwahati evaluations"
  ON public.iitguwahati_evaluations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update to IIT Guwahati evaluations"
  ON public.iitguwahati_evaluations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_iitguwahati_evaluations_updated_at
  BEFORE UPDATE ON public.iitguwahati_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();