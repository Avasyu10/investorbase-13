-- Create startup_section_summaries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.startup_section_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL,
  section_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 100,
  summary text,
  feedback text,
  context_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(submission_id, section_name)
);

-- Enable RLS
ALTER TABLE public.startup_section_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view section summaries for their submissions"
  ON public.startup_section_summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_submissions s
      WHERE s.id = startup_section_summaries.submission_id
      AND s.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Service role can manage section summaries"
  ON public.startup_section_summaries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_startup_section_summaries_submission_id 
  ON public.startup_section_summaries(submission_id);