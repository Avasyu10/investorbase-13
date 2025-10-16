-- Create table for section verdicts and assessments
CREATE TABLE IF NOT EXISTS public.section_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Individual section verdicts
  problem_statement_verdict TEXT,
  problem_statement_score INTEGER,
  
  solution_verdict TEXT,
  solution_score INTEGER,
  
  market_understanding_verdict TEXT,
  market_understanding_score INTEGER,
  
  customer_understanding_verdict TEXT,
  customer_understanding_score INTEGER,
  
  competitor_understanding_verdict TEXT,
  competitor_understanding_score INTEGER,
  
  usp_verdict TEXT,
  usp_score INTEGER,
  
  vision_verdict TEXT,
  vision_score INTEGER,
  
  technology_understanding_verdict TEXT,
  technology_understanding_score INTEGER,
  
  -- Overall assessment
  overall_assessment TEXT,
  overall_score NUMERIC,
  
  -- Detailed scores for each section
  detailed_scores JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.section_verdicts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view verdicts for their companies"
  ON public.section_verdicts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = section_verdicts.company_id
      AND (c.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    )
  );

CREATE POLICY "Users can insert verdicts for their companies"
  ON public.section_verdicts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = section_verdicts.company_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update verdicts for their companies"
  ON public.section_verdicts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = section_verdicts.company_id
      AND c.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_section_verdicts_company_id ON public.section_verdicts(company_id);
CREATE INDEX idx_section_verdicts_user_id ON public.section_verdicts(user_id);