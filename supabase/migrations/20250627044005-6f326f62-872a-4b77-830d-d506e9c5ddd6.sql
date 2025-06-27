
-- Create a table for VC chat messages
CREATE TABLE public.vc_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  to_recipient TEXT NOT NULL DEFAULT 'group_chat',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to ensure only VC users can access messages
ALTER TABLE public.vc_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy that allows VC users to view all VC chat messages
CREATE POLICY "VC users can view all VC chat messages" 
  ON public.vc_chat_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_vc = true
    )
  );

-- Create policy that allows VC users to insert their own messages
CREATE POLICY "VC users can create messages" 
  ON public.vc_chat_messages 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_vc = true
    )
  );

-- Create policy that allows VC users to update their own messages
CREATE POLICY "VC users can update their own messages" 
  ON public.vc_chat_messages 
  FOR UPDATE 
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_vc = true
    )
  );

-- Create policy that allows VC users to delete their own messages
CREATE POLICY "VC users can delete their own messages" 
  ON public.vc_chat_messages 
  FOR DELETE 
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_vc = true
    )
  );

-- Enable realtime for the vc_chat_messages table
ALTER TABLE public.vc_chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vc_chat_messages;
