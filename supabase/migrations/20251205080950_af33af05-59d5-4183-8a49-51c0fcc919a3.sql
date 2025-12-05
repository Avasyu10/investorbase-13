-- Create function to auto-trigger evaluation on new IIT Guwahati submissions
CREATE OR REPLACE FUNCTION public.auto_evaluate_iitguwahati_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  response json;
BEGIN
  -- Log event
  RAISE LOG 'Auto-evaluate triggered for IIT Guwahati submission: %', NEW.id;

  -- Invoke the edge function
  SELECT http_post(
    'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/auto-evaluate-iitguwahati',
    json_build_object('submissionId', NEW.id)::text,
    'application/json'
  ) INTO response;

  RAISE LOG 'Response from auto-evaluate function: %', response;

  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE LOG 'Error in auto-evaluate function: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Create trigger on iitguwahati_form_submissions table
DROP TRIGGER IF EXISTS trigger_auto_evaluate_iitguwahati ON public.iitguwahati_form_submissions;

CREATE TRIGGER trigger_auto_evaluate_iitguwahati
  AFTER INSERT ON public.iitguwahati_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_evaluate_iitguwahati_submission();