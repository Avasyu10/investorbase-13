
-- Enable realtime for eureka_form_submissions table
ALTER TABLE public.eureka_form_submissions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eureka_form_submissions;
