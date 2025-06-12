
-- Update the IIT Bombay user's email address
UPDATE public.profiles 
SET email = 'iitbombaysample@gmail.com' 
WHERE email = 'iitbombaysample.com';

-- Also update the auth.users table to keep it in sync
UPDATE auth.users 
SET email = 'iitbombaysample@gmail.com' 
WHERE email = 'iitbombaysample.com';

-- Verify the changes
SELECT id, email, username, is_admin, is_iitbombay 
FROM public.profiles 
WHERE email = 'iitbombaysample@gmail.com' OR is_admin = true
LIMIT 5;
