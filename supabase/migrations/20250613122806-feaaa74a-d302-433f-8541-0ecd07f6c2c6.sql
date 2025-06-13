
-- Update is_iitbombay to false for all users who currently have it set to true
UPDATE public.profiles 
SET is_iitbombay = false 
WHERE is_iitbombay = true;
