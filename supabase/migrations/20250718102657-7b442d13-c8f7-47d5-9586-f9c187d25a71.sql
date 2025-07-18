-- Update vc_chat_messages table to support founder-VC conversations
-- Add recipient_id column to directly reference the recipient user
-- Add conversation_type to differentiate between VC-internal and VC-founder chats

ALTER TABLE public.vc_chat_messages 
ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'vc_internal';

-- Update RLS policies to allow founders to access VC-founder conversations
DROP POLICY IF EXISTS "VC users and managers can view all VC chat messages" ON public.vc_chat_messages;
DROP POLICY IF EXISTS "VC users and managers can create messages" ON public.vc_chat_messages;
DROP POLICY IF EXISTS "VC users and managers can update their own messages" ON public.vc_chat_messages;
DROP POLICY IF EXISTS "VC users and managers can delete their own messages" ON public.vc_chat_messages;

-- New policies to support both VC-internal and VC-founder conversations
CREATE POLICY "VC users and managers can view VC internal messages" 
  ON public.vc_chat_messages 
  FOR SELECT 
  USING (
    conversation_type = 'vc_internal' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (is_vc = true OR is_manager = true)
    )
  );

CREATE POLICY "Users can view messages they are involved in" 
  ON public.vc_chat_messages 
  FOR SELECT 
  USING (
    conversation_type = 'vc_founder' AND (
      user_id = auth.uid() OR 
      recipient_id = auth.uid()
    )
  );

CREATE POLICY "VC users and managers can create VC internal messages" 
  ON public.vc_chat_messages 
  FOR INSERT 
  WITH CHECK (
    conversation_type = 'vc_internal' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (is_vc = true OR is_manager = true)
    )
  );

CREATE POLICY "Users can create VC-founder messages" 
  ON public.vc_chat_messages 
  FOR INSERT 
  WITH CHECK (
    conversation_type = 'vc_founder' AND (
      user_id = auth.uid() AND (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND (is_vc = true OR is_manager = true)
        ) OR
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND (is_vc = false AND is_manager = false)
        )
      )
    )
  );

CREATE POLICY "Users can update their own messages" 
  ON public.vc_chat_messages 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages" 
  ON public.vc_chat_messages 
  FOR DELETE 
  USING (user_id = auth.uid());