-- Create a table to store enriched company information from Gemini
CREATE TABLE IF NOT EXISTS public.company_enrichment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrichment_data JSONB,
  market_analysis TEXT,
  competitive_landscape TEXT,
  growth_potential TEXT,
  risk_factors TEXT,
  investment_thesis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_enrichment ENABLE ROW LEVEL SECURITY;

-- Users can view enrichment data for companies they have access to
CREATE POLICY "Users can view enrichment for accessible companies"
ON public.company_enrichment
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_enrichment.company_id
    AND (c.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    ))
  )
);

-- Users can insert enrichment data for their companies
CREATE POLICY "Users can insert enrichment for their companies"
ON public.company_enrichment
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_enrichment.company_id
    AND (c.user_id = auth.uid() OR user_id = auth.uid())
  )
);

-- Users can update enrichment data for their companies
CREATE POLICY "Users can update enrichment for their companies"
ON public.company_enrichment
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_enrichment.company_id
    AND (c.user_id = auth.uid() OR user_id = auth.uid())
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_enrichment_company_id ON public.company_enrichment(company_id);
CREATE INDEX IF NOT EXISTS idx_company_enrichment_user_id ON public.company_enrichment(user_id);