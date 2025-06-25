
-- Drop all existing eureka triggers and functions
DROP TRIGGER IF EXISTS auto_analyze_eureka_submission_trigger ON public.eureka_form_submissions;
DROP TRIGGER IF EXISTS delayed_eureka_analysis_trigger ON public.eureka_form_submissions;
DROP TRIGGER IF EXISTS set_eureka_initial_status_trigger ON public.eureka_form_submissions;
DROP TRIGGER IF EXISTS analyze_eureka_after_commit_trigger ON public.eureka_form_submissions;

DROP FUNCTION IF EXISTS public.auto_analyze_eureka_submission();
DROP FUNCTION IF EXISTS public.delayed_eureka_analysis();
DROP FUNCTION IF EXISTS public.set_eureka_initial_status();
DROP FUNCTION IF EXISTS public.analyze_eureka_after_commit();

-- Create a simple, reliable trigger function that just notifies
CREATE OR REPLACE FUNCTION public.notify_eureka_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Set initial status
  NEW.analysis_status = 'pending';
  
  -- Send notification for external processing
  PERFORM pg_notify(
    'eureka_submission_created',
    json_build_object(
      'submissionId', NEW.id,
      'companyName', NEW.company_name,
      'submitterEmail', NEW.submitter_email,
      'timestamp', extract(epoch from now())
    )::text
  );
  
  RETURN NEW;
END;
$function$;

-- Create a simple BEFORE INSERT trigger
CREATE TRIGGER notify_eureka_submission_trigger
  BEFORE INSERT ON public.eureka_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_eureka_submission();

-- Create a function to manually trigger analysis (for use by edge functions)
CREATE OR REPLACE FUNCTION public.trigger_eureka_analysis(submission_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  submission_record record;
  response json;
BEGIN
  -- Get the submission
  SELECT * INTO submission_record 
  FROM eureka_form_submissions 
  WHERE id = submission_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Submission not found');
  END IF;
  
  -- Update status to processing
  UPDATE eureka_form_submissions 
  SET analysis_status = 'processing', updated_at = now()
  WHERE id = submission_id;
  
  -- Call the analysis function
  BEGIN
    SELECT http_post(
      'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/analyze-eureka-form',
      json_build_object(
        'submissionId', submission_id,
        'companyName', submission_record.company_name,
        'submitterEmail', submission_record.submitter_email
      )::text,
      'application/json'
    ) INTO response;
    
    RETURN json_build_object('success', true, 'response', response);
  EXCEPTION WHEN others THEN
    -- Update status to failed on error
    UPDATE eureka_form_submissions 
    SET 
      analysis_status = 'failed',
      analysis_error = SQLERRM,
      updated_at = now()
    WHERE id = submission_id;
    
    RETURN json_build_object('error', SQLERRM);
  END;
END;
$function$;
