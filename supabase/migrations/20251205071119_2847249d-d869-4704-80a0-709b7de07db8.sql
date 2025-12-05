-- Create table for IIT Guwahati market research
CREATE TABLE public.iitguwahati_market_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL UNIQUE REFERENCES public.iitguwahati_form_submissions(id) ON DELETE CASCADE,
  research_text TEXT,
  research_summary TEXT,
  sources JSONB,
  news_highlights JSONB,
  market_insights JSONB,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.iitguwahati_market_research ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view iitguwahati market research"
ON public.iitguwahati_market_research
FOR SELECT
USING (true);

CREATE POLICY "Users can insert iitguwahati market research"
ON public.iitguwahati_market_research
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update iitguwahati market research"
ON public.iitguwahati_market_research
FOR UPDATE
USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_iitguwahati_market_research_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_iitguwahati_market_research_updated_at
BEFORE UPDATE ON public.iitguwahati_market_research
FOR EACH ROW
EXECUTE FUNCTION public.update_iitguwahati_market_research_updated_at();