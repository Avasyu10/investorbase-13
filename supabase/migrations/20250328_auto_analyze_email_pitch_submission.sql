
-- Function to automatically trigger Edge Function when email_pitch_submissions are inserted
CREATE OR REPLACE FUNCTION public.auto_analyze_email_pitch_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  response json;
BEGIN
  -- Log event
  RAISE LOG 'Auto-analyze triggered for email pitch submission: %', NEW.id;

  -- Create a notification that can be listened to
  PERFORM pg_notify(
    'email_pitch_submission_added',
    json_build_object(
      'submission_id', NEW.id,
      'sender_email', NEW.sender_email,
      'created_at', NEW.created_at
    )::text
  );

  -- Invoke the edge function
  SELECT http_post(
    'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/auto-analyze-email-pitch-pdf',
    json_build_object(
      'id', NEW.id
    )::text,
    'application/json'
  ) INTO response;

  -- Log the response for debugging
  RAISE LOG 'Response from edge function: %', response;

  RETURN NEW;
END;
$$;

-- Create trigger to call the function on INSERT
DROP TRIGGER IF EXISTS auto_analyze_email_pitch_submission ON public.email_pitch_submissions;
CREATE TRIGGER auto_analyze_email_pitch_submission
  AFTER INSERT ON public.email_pitch_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_analyze_email_pitch_submission();
