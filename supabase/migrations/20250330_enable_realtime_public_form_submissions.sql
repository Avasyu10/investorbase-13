
-- Enable row-level changes for the public_form_submissions table
ALTER TABLE public.public_form_submissions REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_form_submissions;
