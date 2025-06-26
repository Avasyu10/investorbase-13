
-- Enable row-level changes for the company_details table to capture full row data
ALTER TABLE public.company_details REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication to enable real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_details;
