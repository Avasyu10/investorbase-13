
-- Enable row-level changes for the email_pitch_submissions table
ALTER TABLE public.email_pitch_submissions REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_pitch_submissions;
