
-- Fix the auto-analyze function to properly handle JSON formatting and remove HTTP call
CREATE OR REPLACE FUNCTION public.auto_analyze_eureka_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Log event
  RAISE LOG 'Auto-analyze triggered for Eureka submission: %', NEW.id;

  -- Create a notification that can be listened to by the realtime system
  PERFORM pg_notify(
    'eureka_submission_added',
    json_build_object(
      'submissionId', NEW.id,
      'companyName', NEW.company_name,
      'submitterEmail', NEW.submitter_email,
      'createdAt', NEW.created_at
    )::text
  );

  -- Set initial status to processing
  UPDATE public.eureka_form_submissions 
  SET 
    analysis_status = 'processing',
    updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Log the error but don't fail the insert
  RAISE LOG 'Error in auto-analyze function: %', SQLERRM;
  RETURN NEW;
END;
$function$;
