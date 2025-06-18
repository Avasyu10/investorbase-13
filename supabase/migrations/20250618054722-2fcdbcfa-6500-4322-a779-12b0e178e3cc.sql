
-- Create a new public submission form for the Eureka Sample
INSERT INTO public.public_submission_forms (
  form_name,
  form_slug,
  form_type,
  is_active,
  auto_analyze,
  user_id
) VALUES (
  'IIT Bombay Eureka Sample Form',
  'iit-bombay-eureka',
  'barc',
  true,
  true,
  (SELECT id FROM auth.users LIMIT 1) -- This will use the first available user ID
);
