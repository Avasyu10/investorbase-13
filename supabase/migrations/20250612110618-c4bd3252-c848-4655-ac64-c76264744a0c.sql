
-- Remove BARC form submissions table and related data
DROP TABLE IF EXISTS public.barc_form_submissions CASCADE;

-- Remove any BARC-specific form entries from public_submission_forms
DELETE FROM public.public_submission_forms WHERE form_type = 'barc';

-- Reset the form_type column default back to 'general' only
ALTER TABLE public.public_submission_forms 
ALTER COLUMN form_type SET DEFAULT 'general';
