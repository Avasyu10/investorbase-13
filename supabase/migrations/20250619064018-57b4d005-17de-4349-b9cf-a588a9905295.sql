
-- Add a new column to store the reason for scoring
ALTER TABLE public.companies 
ADD COLUMN scoring_reason text;

-- Add a comment to describe the column
COMMENT ON COLUMN public.companies.scoring_reason IS 'Brief explanation of why the company received its overall score';
