
-- Add poc_name and phoneno columns to barc_form_submissions table
ALTER TABLE public.barc_form_submissions 
ADD COLUMN poc_name text,
ADD COLUMN phoneno text;
