-- Add phone number field to vc_connection_requests table
ALTER TABLE public.vc_connection_requests 
ADD COLUMN vc_phone TEXT;