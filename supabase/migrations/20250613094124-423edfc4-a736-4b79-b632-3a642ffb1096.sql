
-- Set is_iitbombay to false for kanishksaxena1103@gmail.com
UPDATE public.profiles 
SET is_iitbombay = false 
WHERE email = 'kanishksaxena1103@gmail.com';

-- Set is_iitbombay to true for iitbombaydemo@gmail.com
UPDATE public.profiles 
SET is_iitbombay = true 
WHERE email = 'iitbombaydemo@gmail.com';

-- Verify the changes
SELECT id, email, username, is_admin, is_iitbombay 
FROM public.profiles 
WHERE email IN ('kanishksaxena1103@gmail.com', 'iitbombaydemo@gmail.com')
ORDER BY email;
