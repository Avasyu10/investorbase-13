
-- Add a column to track signup source
ALTER TABLE public.profiles 
ADD COLUMN signup_source TEXT DEFAULT 'founder_signup';

-- Update existing profiles to have the founder_signup source
UPDATE public.profiles 
SET signup_source = 'founder_signup';

-- Update the handle_new_user function to set signup source
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, email, full_name, signup_source)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'founder_signup'
  );
  RETURN NEW;
END;
$function$;
