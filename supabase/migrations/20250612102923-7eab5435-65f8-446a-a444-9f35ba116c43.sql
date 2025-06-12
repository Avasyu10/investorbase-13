
-- Add is_iitbombay column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_iitbombay boolean NOT NULL DEFAULT false;

-- Update the existing user profile to set is_iitbombay to true
UPDATE public.profiles 
SET is_iitbombay = true 
WHERE email = 'iitbombaysample.com';

-- Verify the changes
SELECT id, email, username, is_admin, is_iitbombay 
FROM public.profiles 
WHERE email = 'iitbombaysample.com' OR is_admin = true
LIMIT 5;
