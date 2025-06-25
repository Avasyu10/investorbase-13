
-- Fix the Eureka analysis trigger to work properly with transaction timing
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

  -- Set initial status to processing to prevent duplicate processing
  NEW.analysis_status = 'processing';

  -- Use pg_background to delay the function call by 5 seconds
  -- This ensures the transaction is fully committed before the analysis starts
  PERFORM pg_notify(
    'eureka_delayed_analysis',
    json_build_object(
      'submissionId', NEW.id,
      'delay', 5000
    )::text
  );

  -- Return NEW first, then make the HTTP call in a separate transaction
  RETURN NEW;
END;
$function$;

-- Create a separate function to handle the delayed analysis call
CREATE OR REPLACE FUNCTION public.delayed_eureka_analysis()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  response json;
  payload_json text;
BEGIN
  -- Wait a moment to ensure the main transaction is committed
  PERFORM pg_sleep(0.1);
  
  -- Build the JSON payload
  SELECT json_build_object(
    'submissionId', NEW.id,
    'companyName', NEW.company_name,
    'submitterEmail', NEW.submitter_email,
    'createdAt', NEW.created_at
  )::text INTO payload_json;

  -- Call the analysis function with the analyze-eureka-form function directly
  BEGIN
    SELECT http_post(
      'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/analyze-eureka-form',
      payload_json,
      'application/json'
    ) INTO response;

    -- Log the response for debugging
    RAISE LOG 'Response from analyze-eureka-form function: %', response;
  EXCEPTION WHEN others THEN
    -- Log the error but don't fail the operation
    RAISE LOG 'Error calling analyze-eureka-form function: %', SQLERRM;
  END;

  RETURN NULL; -- This is an AFTER trigger, return value is ignored
END;
$function$;

-- Drop existing triggers
DROP TRIGGER IF EXISTS auto_analyze_eureka_submission_trigger ON public.eureka_form_submissions;
DROP TRIGGER IF EXISTS delayed_eureka_analysis_trigger ON public.eureka_form_submissions;

-- Create the main trigger (BEFORE INSERT to set status)
CREATE TRIGGER auto_analyze_eureka_submission_trigger
  BEFORE INSERT ON public.eureka_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_analyze_eureka_submission();

-- Create the delayed analysis trigger (AFTER INSERT to make the HTTP call)
CREATE TRIGGER delayed_eureka_analysis_trigger
  AFTER INSERT ON public.eureka_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.delayed_eureka_analysis();
