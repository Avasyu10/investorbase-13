
-- Create a security definer function that will handle the toggle update
-- This ensures we can update records properly while respecting RLS
CREATE OR REPLACE FUNCTION public.update_investor_pitch_email_setting(record_id UUID, auto_analyze_value BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_row_count INTEGER;
BEGIN
  UPDATE public.investor_pitch_emails
  SET auto_analyze = auto_analyze_value
  WHERE id = record_id AND user_id = auth.uid();
  
  GET DIAGNOSTICS updated_row_count = ROW_COUNT;
  
  RETURN updated_row_count > 0;
END;
$$;
