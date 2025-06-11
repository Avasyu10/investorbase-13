
-- Add analysis columns to the existing barc_form_submissions table
ALTER TABLE public.barc_form_submissions 
ADD COLUMN analysis_status text DEFAULT 'pending',
ADD COLUMN analysis_result jsonb,
ADD COLUMN analysis_error text,
ADD COLUMN analyzed_at timestamp with time zone;

-- Update the trigger to handle the updated_at column
CREATE OR REPLACE FUNCTION update_barc_submissions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_barc_submissions_updated_at_trigger
  BEFORE UPDATE ON public.barc_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_barc_submissions_updated_at();
