
-- Remove the existing trigger that causes timing issues
DROP TRIGGER IF EXISTS auto_analyze_eureka_submission_trigger ON public.eureka_form_submissions;

-- Update the function to be more reliable (but we won't use it as a trigger anymore)
CREATE OR REPLACE FUNCTION public.auto_analyze_eureka_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  response json;
  payload_json text;
BEGIN
  -- Log event
  RAISE LOG 'Auto-analyze triggered for Eureka submission: %', NEW.id;

  -- Build the JSON payload properly
  SELECT json_build_object(
    'submissionId', NEW.id,
    'companyName', NEW.company_name,
    'submitterEmail', NEW.submitter_email,
    'createdAt', NEW.created_at
  )::text INTO payload_json;

  -- Create a notification that can be listened to
  PERFORM pg_notify(
    'eureka_submission_added',
    payload_json
  );

  -- Log success
  RAISE LOG 'Eureka submission processed successfully: %', NEW.id;

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Log the error but don't fail the insert
  RAISE LOG 'Error in auto-analyze function: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Note: We intentionally do not create the trigger here
-- The frontend will handle calling the analysis function directly
-- This prevents timing issues between insert and analysis
