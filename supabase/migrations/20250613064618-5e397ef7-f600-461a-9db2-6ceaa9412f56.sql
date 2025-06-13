
-- Add company_linkedin_url column to barc_form_submissions table
ALTER TABLE public.barc_form_submissions 
ADD COLUMN company_linkedin_url text;
