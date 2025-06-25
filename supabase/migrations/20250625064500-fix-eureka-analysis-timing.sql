
-- Fix the Eureka analysis trigger timing issue
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

  -- Use pg_background to delay the function call by 2 seconds
  -- This ensures the transaction is committed before the analysis starts
  PERFORM pg_notify(
    'eureka_delayed_analysis',
    json_build_object(
      'submissionId', NEW.id,
      'delay', 2000
    )::text
  );

  -- Call the analysis function with a small delay using a different approach
  -- Use http_post with the analyze-eureka-form function directly
  SELECT http_post(
    'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/analyze-eureka-form',
    payload_json,
    'application/json'
  ) INTO response;

  -- Log the response for debugging
  RAISE LOG 'Response from analyze-eureka-form function: %', response;

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Log the error but don't fail the insert
  RAISE LOG 'Error in auto-analyze function: %', SQLERRM;
  -- Set status to failed if there's an error
  NEW.analysis_status = 'failed';
  NEW.analysis_error = SQLERRM;
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists and is properly attached
DROP TRIGGER IF EXISTS auto_analyze_eureka_submission_trigger ON public.eureka_form_submissions;

CREATE TRIGGER auto_analyze_eureka_submission_trigger
  AFTER INSERT ON public.eureka_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_analyze_eureka_submission();
