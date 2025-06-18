
-- Fix the auto-analyze function to properly handle JSON formatting and remove HTTP call
CREATE OR REPLACE FUNCTION public.auto_analyze_eureka_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Log event
  RAISE LOG 'Auto-analyze triggered for Eureka submission: %', NEW.id;

  -- Set initial status to pending (the frontend will call analyze-eureka-form manually)
  UPDATE public.eureka_form_submissions 
  SET 
    analysis_status = 'pending',
    updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Log the error but don't fail the insert
  RAISE LOG 'Error in auto-analyze function: %', SQLERRM;
  RETURN NEW;
END;
$function$;
