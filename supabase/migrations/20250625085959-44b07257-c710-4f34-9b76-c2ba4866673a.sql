
-- Add is_vc column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_vc boolean NOT NULL DEFAULT false;

-- Set is_vc to false for all existing users (this is already the default)
UPDATE public.profiles 
SET is_vc = false 
WHERE is_vc IS NULL;
