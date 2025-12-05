-- Update the profile for IIT Guwahati user once they sign up
-- Run this after creating the user in Auth
UPDATE public.profiles 
SET is_iitguwahati_incubator = true 
WHERE email = 'iitguwahati@investorbase.io';