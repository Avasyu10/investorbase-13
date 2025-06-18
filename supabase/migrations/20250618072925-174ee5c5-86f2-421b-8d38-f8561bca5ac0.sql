
-- Fix the auto-analyze function to properly handle JSON formatting
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

  -- Invoke the edge function with proper JSON formatting
  SELECT http_post(
    'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/auto-analyze-eureka-submission',
    payload_json,
    'application/json'
  ) INTO response;

  -- Log the response for debugging
  RAISE LOG 'Response from auto-analyze edge function: %', response;

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Log the error but don't fail the insert
  RAISE LOG 'Error in auto-analyze function: %', SQLERRM;
  RETURN NEW;
END;
$function$;
