-- Create table for API keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own API keys
CREATE POLICY "Users can view their own API keys"
ON public.api_keys
FOR SELECT
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND is_admin = true
));

-- Policy: Users can create their own API keys
CREATE POLICY "Users can create their own API keys"
ON public.api_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND is_admin = true
));

-- Policy: Users can update their own API keys
CREATE POLICY "Users can update their own API keys"
ON public.api_keys
FOR UPDATE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND is_admin = true
));

-- Policy: Users can delete their own API keys
CREATE POLICY "Users can delete their own API keys"
ON public.api_keys
FOR DELETE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND is_admin = true
));

-- Create index for faster API key lookups
CREATE INDEX idx_api_keys_key ON public.api_keys(api_key) WHERE is_active = true;