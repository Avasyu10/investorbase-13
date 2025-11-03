-- Create table to store startup section summaries
CREATE TABLE IF NOT EXISTS public.startup_section_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.startup_submissions(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  summary TEXT NOT NULL,
  feedback TEXT,
  context_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(submission_id, section_name)
);

-- Enable Row Level Security
ALTER TABLE public.startup_section_summaries ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view summaries
CREATE POLICY "Users can view startup section summaries"
ON public.startup_section_summaries
FOR SELECT
USING (true);

-- Create policy for authenticated users to insert summaries
CREATE POLICY "Users can insert startup section summaries"
ON public.startup_section_summaries
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy for authenticated users to update their summaries
CREATE POLICY "Users can update startup section summaries"
ON public.startup_section_summaries
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_startup_section_summaries_submission_id 
ON public.startup_section_summaries(submission_id);

CREATE INDEX IF NOT EXISTS idx_startup_section_summaries_section_name 
ON public.startup_section_summaries(section_name);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_startup_section_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_startup_section_summaries_updated_at
BEFORE UPDATE ON public.startup_section_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_startup_section_summaries_updated_at();