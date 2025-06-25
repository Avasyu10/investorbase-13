
-- Drop all existing triggers first
DROP TRIGGER IF EXISTS auto_analyze_eureka_submission_trigger ON public.eureka_form_submissions;
DROP TRIGGER IF EXISTS delayed_eureka_analysis_trigger ON public.eureka_form_submissions;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.auto_analyze_eureka_submission();
DROP FUNCTION IF EXISTS public.delayed_eureka_analysis();

-- Create a simple function that just sets the initial status
CREATE OR REPLACE FUNCTION public.set_eureka_initial_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Just set the initial status, don't make any HTTP calls yet
  NEW.analysis_status = 'pending';
  RETURN NEW;
END;
$function$;

-- Create the main analysis function that will be called after commit
CREATE OR REPLACE FUNCTION public.analyze_eureka_after_commit()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  response json;
  payload_json text;
BEGIN
  -- Add a small delay to ensure transaction is fully committed
  PERFORM pg_sleep(2);
  
  -- Log event
  RAISE LOG 'Analyzing Eureka submission after commit: %', NEW.id;

  -- Build the JSON payload
  SELECT json_build_object(
    'submissionId', NEW.id,
    'companyName', NEW.company_name,
    'submitterEmail', NEW.submitter_email,
    'createdAt', NEW.created_at
  )::text INTO payload_json;

  -- Update status to processing first
  UPDATE public.eureka_form_submissions 
  SET analysis_status = 'processing'
  WHERE id = NEW.id;

  -- Call the analysis function
  BEGIN
    SELECT http_post(
      'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/analyze-eureka-form',
      payload_json,
      'application/json'
    ) INTO response;

    RAISE LOG 'Response from analyze-eureka-form: %', response;
  EXCEPTION WHEN others THEN
    -- Log error and update status
    RAISE LOG 'Error calling analyze-eureka-form: %', SQLERRM;
    UPDATE public.eureka_form_submissions 
    SET 
      analysis_status = 'failed',
      analysis_error = SQLERRM
    WHERE id = NEW.id;
  END;

  RETURN NULL; -- AFTER trigger, return value ignored
END;
$function$;

-- Create BEFORE INSERT trigger to set initial status
CREATE TRIGGER set_eureka_initial_status_trigger
  BEFORE INSERT ON public.eureka_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_eureka_initial_status();

-- Create AFTER INSERT trigger with DEFERRABLE to ensure it runs after commit
CREATE CONSTRAINT TRIGGER analyze_eureka_after_commit_trigger
  AFTER INSERT ON public.eureka_form_submissions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.analyze_eureka_after_commit();
