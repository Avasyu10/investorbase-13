
-- Create function to auto-analyze Eureka submissions when they are inserted
CREATE OR REPLACE FUNCTION public.auto_analyze_eureka_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  response json;
BEGIN
  -- Log event
  RAISE LOG 'Auto-analyze triggered for Eureka submission: %', NEW.id;

  -- Create a notification that can be listened to
  PERFORM pg_notify(
    'eureka_submission_added',
    json_build_object(
      'submission_id', NEW.id,
      'company_name', NEW.company_name,
      'submitter_email', NEW.submitter_email,
      'created_at', NEW.created_at
    )::text
  );

  -- Invoke the edge function
  SELECT http_post(
    'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/auto-analyze-eureka-submission',
    json_build_object(
      'submissionId', NEW.id,
      'companyName', NEW.company_name,
      'submitterEmail', NEW.submitter_email,
      'createdAt', NEW.created_at
    )::text,
    'application/json'
  ) INTO response;

  -- Log the response for debugging
  RAISE LOG 'Response from auto-analyze edge function: %', response;

  RETURN NEW;
END;
$function$;

-- Create trigger to automatically analyze Eureka submissions
DROP TRIGGER IF EXISTS auto_analyze_eureka_submission_trigger ON public.eureka_form_submissions;
CREATE TRIGGER auto_analyze_eureka_submission_trigger
  AFTER INSERT ON public.eureka_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_analyze_eureka_submission();
