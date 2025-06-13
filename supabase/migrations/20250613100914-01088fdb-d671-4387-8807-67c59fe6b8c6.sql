
-- Add industry column to barc_form_submissions table and migrate existing data
ALTER TABLE public.barc_form_submissions 
ADD COLUMN industry text;

-- Migrate existing company_type data to industry column
UPDATE public.barc_form_submissions 
SET industry = company_type 
WHERE company_type IS NOT NULL;

-- We'll keep company_type for now to avoid breaking existing functionality
-- but it can be removed in a future migration once fully migrated
