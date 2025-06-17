
-- Update the handle_new_user function to not automatically set signup_source
-- It should only be set when explicitly provided through metadata
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
    NEW.raw_user_meta_data->>'signup_source'
  );
  RETURN NEW;
END;
$function$;

-- Update existing externally created profiles to have null signup_source
-- This assumes externally created users don't have the founder signup metadata
UPDATE public.profiles 
SET signup_source = NULL 
WHERE id IN (
  SELECT u.id 
  FROM auth.users u 
  WHERE u.raw_user_meta_data->>'signup_source' IS NULL
);
