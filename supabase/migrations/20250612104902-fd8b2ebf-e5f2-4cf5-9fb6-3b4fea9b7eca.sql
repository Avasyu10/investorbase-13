
-- Set is_iitbombay to true for the specific user email
UPDATE public.profiles 
SET is_iitbombay = true 
WHERE email = 'kanishksaxena1103@gmail.com';

-- Remove is_iitbombay flag from the old sample user
UPDATE public.profiles 
SET is_iitbombay = false 
WHERE email = 'iitbombaysample@gmail.com';

-- Verify the changes - should show kanishksaxena1103@gmail.com with is_iitbombay = true
SELECT id, email, username, is_admin, is_iitbombay 
FROM public.profiles 
WHERE email IN ('kanishksaxena1103@gmail.com', 'iitbombaysample@gmail.com')
ORDER BY email;
