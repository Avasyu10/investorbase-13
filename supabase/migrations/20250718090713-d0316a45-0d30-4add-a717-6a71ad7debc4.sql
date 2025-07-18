-- Create notifications table for VC-founder interactions
CREATE TABLE public.vc_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vc_profile_id UUID NOT NULL,
  company_id UUID NOT NULL,
  founder_user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  company_stage TEXT,
  company_industry TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.vc_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for VC notifications
CREATE POLICY "VCs can view notifications for their profiles" 
ON public.vc_notifications 
FOR SELECT 
USING (
  vc_profile_id IN (
    SELECT id FROM vc_profiles WHERE id = vc_profile_id
  ) AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_vc = true
  )
);

CREATE POLICY "Founders can create notifications" 
ON public.vc_notifications 
FOR INSERT 
WITH CHECK (auth.uid() = founder_user_id);

CREATE POLICY "VCs can update their notifications" 
ON public.vc_notifications 
FOR UPDATE 
USING (
  vc_profile_id IN (
    SELECT id FROM vc_profiles WHERE id = vc_profile_id
  ) AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_vc = true
  )
);

-- Create index for better performance
CREATE INDEX idx_vc_notifications_vc_profile_id ON public.vc_notifications(vc_profile_id);
CREATE INDEX idx_vc_notifications_created_at ON public.vc_notifications(created_at DESC);