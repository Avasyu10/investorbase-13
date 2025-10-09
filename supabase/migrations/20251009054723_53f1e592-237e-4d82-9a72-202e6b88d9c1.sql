-- Create table for problem statement evaluations
CREATE TABLE IF NOT EXISTS public.problem_statement_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_name TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  evaluator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Individual criterion scores (1-20)
  existence_score INTEGER NOT NULL CHECK (existence_score >= 1 AND existence_score <= 20),
  severity_score INTEGER NOT NULL CHECK (severity_score >= 1 AND severity_score <= 20),
  frequency_score INTEGER NOT NULL CHECK (frequency_score >= 1 AND frequency_score <= 20),
  unmet_need_score INTEGER NOT NULL CHECK (unmet_need_score >= 1 AND unmet_need_score <= 20),
  
  -- Average score
  average_score NUMERIC(4,2) NOT NULL,
  
  -- AI analysis results
  ai_analysis_summary TEXT,
  ai_recommendations TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.problem_statement_evaluations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all evaluations"
  ON public.problem_statement_evaluations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own evaluations"
  ON public.problem_statement_evaluations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = evaluator_user_id);

CREATE POLICY "Users can update their own evaluations"
  ON public.problem_statement_evaluations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = evaluator_user_id);

CREATE POLICY "Users can delete their own evaluations"
  ON public.problem_statement_evaluations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = evaluator_user_id);

-- Create index for faster queries
CREATE INDEX idx_problem_evaluations_user ON public.problem_statement_evaluations(evaluator_user_id);
CREATE INDEX idx_problem_evaluations_created ON public.problem_statement_evaluations(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_problem_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_problem_evaluations_timestamp
  BEFORE UPDATE ON public.problem_statement_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_problem_evaluations_updated_at();