
-- Add is_manager column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_manager boolean NOT NULL DEFAULT false;

-- Set is_manager to true for the specific user
UPDATE public.profiles 
SET is_manager = true 
WHERE email = 'kanishksaxena1103@gmail.com';

-- Add recipient_id column to vc_chat_messages table for cross-messaging
ALTER TABLE public.vc_chat_messages 
ADD COLUMN recipient_id uuid REFERENCES auth.users(id);

-- Update the RLS policies to allow VC users and managers to access messages
DROP POLICY IF EXISTS "VC users can view all VC chat messages" ON public.vc_chat_messages;
DROP POLICY IF EXISTS "VC users can create messages" ON public.vc_chat_messages;
DROP POLICY IF EXISTS "VC users can update their own messages" ON public.vc_chat_messages;
DROP POLICY IF EXISTS "VC users can delete their own messages" ON public.vc_chat_messages;

-- Create updated policy that allows VC users and managers to view all VC chat messages
CREATE POLICY "VC users and managers can view all VC chat messages" 
  ON public.vc_chat_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (is_vc = true OR is_manager = true)
    )
  );

-- Create updated policy that allows VC users and managers to insert messages
CREATE POLICY "VC users and managers can create messages" 
  ON public.vc_chat_messages 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (is_vc = true OR is_manager = true)
    )
  );

-- Create updated policy that allows VC users and managers to update their own messages
CREATE POLICY "VC users and managers can update their own messages" 
  ON public.vc_chat_messages 
  FOR UPDATE 
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (is_vc = true OR is_manager = true)
    )
  );

-- Create updated policy that allows VC users and managers to delete their own messages
CREATE POLICY "VC users and managers can delete their own messages" 
  ON public.vc_chat_messages 
  FOR DELETE 
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (is_vc = true OR is_manager = true)
    )
  );
