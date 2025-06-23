
-- Add the missing analysis_result column to the reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS analysis_result jsonb;

-- Add columns for tracking analysis status and timing
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS analyzed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS overall_score numeric;
