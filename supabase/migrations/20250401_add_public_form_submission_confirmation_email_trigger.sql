
-- Function to automatically trigger Edge Function when public_form_submissions are inserted
CREATE OR REPLACE FUNCTION public.send_confirmation_email_for_public_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  response json;
BEGIN
  -- Log event
  RAISE LOG 'Confirmation email triggered for public form submission: %', NEW.id;

  -- Create a notification that can be listened to
  PERFORM pg_notify(
    'public_form_submission_added',
    json_build_object(
      'submission_id', NEW.id,
      'submitter_email', NEW.submitter_email,
      'created_at', NEW.created_at
    )::text
  );

  -- Invoke the edge function if submitter email is provided
  IF NEW.submitter_email IS NOT NULL THEN
    SELECT http_post(
      'https://jhtnruktmtjqrfoiyrep.supabase.co/functions/v1/barc_confirmation_email',
      json_build_object(
        'submissionId', NEW.id
      )::text,
      'application/json'
    ) INTO response;

    -- Log the response for debugging
    RAISE LOG 'Response from barc_confirmation_email function: %', response;
  ELSE
    RAISE LOG 'No submitter email found for submission %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to call the function on INSERT
DROP TRIGGER IF EXISTS send_confirmation_email_for_public_submission ON public.public_form_submissions;
CREATE TRIGGER send_confirmation_email_for_public_submission
  AFTER INSERT ON public.public_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.send_confirmation_email_for_public_submission();
