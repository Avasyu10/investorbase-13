-- Create IIT Guwahati form submissions table
CREATE TABLE public.iitguwahati_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Submitter Info
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_email TEXT NOT NULL,
  founder_name TEXT,
  startup_name TEXT NOT NULL,
  linkedin_url TEXT,
  phone_number TEXT,
  
  -- I. The Problem
  domain_and_problem TEXT, -- Industry and core pain point
  target_market_size TEXT, -- TAM/SAM/SOM quantified market opportunity
  
  -- II. The Solution
  unique_proposition TEXT, -- Innovative core and key competitive advantage
  
  -- III. The Product
  product_type_and_stage TEXT, -- Classification (SaaS, MVP) and development status
  
  -- IV. Business Model
  primary_revenue_model TEXT, -- Subscription, Transaction Fee, Licensing
  ltv_cac_ratio TEXT, -- LTV:CAC ratio projected/actual
  
  -- V. Finances
  total_funding_sought TEXT, -- Amount of capital required
  key_traction_metric TEXT, -- MRR, Users, Pilot Results
  
  -- VI. Patents & Legalities
  ip_moat_status TEXT, -- Patent Filed/Granted, Trademarked, Trade Secret
  
  -- VII. Future Goals
  twelve_month_roadmap TEXT, -- Biggest goal for next year
  
  -- Analysis fields
  form_slug TEXT NOT NULL,
  analysis_status TEXT DEFAULT 'pending',
  analysis_result JSONB,
  analysis_error TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  report_id UUID,
  company_id UUID
);

-- Enable RLS
ALTER TABLE public.iitguwahati_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_iitguwahati_submissions_updated_at
  BEFORE UPDATE ON public.iitguwahati_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();

-- RLS Policies
-- Anyone can submit
CREATE POLICY "Anyone can submit to IIT Guwahati forms"
  ON public.iitguwahati_form_submissions
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated view
CREATE POLICY "Allow authenticated view of IIT Guwahati submissions"
  ON public.iitguwahati_form_submissions
  FOR SELECT
  USING (true);

-- Allow updates
CREATE POLICY "Allow updates to IIT Guwahati submissions"
  ON public.iitguwahati_form_submissions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Service role full access
CREATE POLICY "Service role full access to IIT Guwahati submissions"
  ON public.iitguwahati_form_submissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add is_iitguwahati column to profiles if not exists (for the new user type)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_iitguwahati_incubator BOOLEAN DEFAULT false;