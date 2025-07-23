-- Create a table for VC connection requests
CREATE TABLE public.vc_connection_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_user_id UUID NOT NULL,
  founder_name TEXT NOT NULL,
  founder_email TEXT NOT NULL,
  company_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  vc_name TEXT NOT NULL,
  vc_email TEXT,
  vc_website TEXT,
  vc_linkedin TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable Row Level Security
ALTER TABLE public.vc_connection_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for VC connection requests
CREATE POLICY "Users can create their own connection requests" 
ON public.vc_connection_requests 
FOR INSERT 
WITH CHECK (auth.uid() = founder_user_id);

CREATE POLICY "View-only users can see all connection requests" 
ON public.vc_connection_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_view = true
  )
);

CREATE POLICY "Founders can view their own connection requests" 
ON public.vc_connection_requests 
FOR SELECT 
USING (auth.uid() = founder_user_id);

-- Create index for better performance
CREATE INDEX idx_vc_connection_requests_founder_user_id ON public.vc_connection_requests(founder_user_id);
CREATE INDEX idx_vc_connection_requests_created_at ON public.vc_connection_requests(created_at DESC);