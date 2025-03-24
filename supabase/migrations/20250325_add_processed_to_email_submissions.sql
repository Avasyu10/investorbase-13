
-- Add a 'processed' column to email_submissions table to track which ones have been auto-analyzed
ALTER TABLE public.email_submissions ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT NULL;

-- Add an index for better performance when querying by processed status
CREATE INDEX IF NOT EXISTS idx_email_submissions_processed ON public.email_submissions (processed);

-- Add comment explaining the purpose of the column
COMMENT ON COLUMN public.email_submissions.processed IS 'Indicates whether this email submission has been processed by auto-analyze';
