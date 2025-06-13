
-- Add LinkedIn URLs column to barc_form_submissions table
ALTER TABLE public.barc_form_submissions 
ADD COLUMN founder_linkedin_urls TEXT[] DEFAULT '{}';

-- Add a comment to document the new column
COMMENT ON COLUMN public.barc_form_submissions.founder_linkedin_urls IS 'Array of LinkedIn profile URLs for company founders';
