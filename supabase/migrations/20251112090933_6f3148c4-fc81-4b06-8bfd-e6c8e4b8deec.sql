-- Create startup_market_research table
CREATE TABLE IF NOT EXISTS public.startup_market_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_submission_id UUID NOT NULL REFERENCES public.startup_submissions(id) ON DELETE CASCADE,
  research_text TEXT,
  research_summary TEXT,
  news_highlights JSONB,
  market_insights JSONB,
  sources JSONB,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.startup_market_research ENABLE ROW LEVEL SECURITY;

-- Create policies for startup_market_research
CREATE POLICY "Users can view startup market research"
  ON public.startup_market_research
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_submissions ss
      WHERE ss.id = startup_market_research.startup_submission_id
      AND (ss.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    )
  );

CREATE POLICY "Users can insert startup market research"
  ON public.startup_market_research
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.startup_submissions ss
      WHERE ss.id = startup_market_research.startup_submission_id
      AND (ss.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
      ))
    )
  );

CREATE POLICY "Service role can manage startup market research"
  ON public.startup_market_research
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_startup_market_research_submission_id 
  ON public.startup_market_research(startup_submission_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_startup_market_research_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_startup_market_research_updated_at
  BEFORE UPDATE ON public.startup_market_research
  FOR EACH ROW
  EXECUTE FUNCTION update_startup_market_research_updated_at();