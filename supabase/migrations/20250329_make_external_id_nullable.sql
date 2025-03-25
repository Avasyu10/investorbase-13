
-- Make external_id column nullable in email_pitch_submissions table
ALTER TABLE public.email_pitch_submissions ALTER COLUMN external_id DROP NOT NULL;
