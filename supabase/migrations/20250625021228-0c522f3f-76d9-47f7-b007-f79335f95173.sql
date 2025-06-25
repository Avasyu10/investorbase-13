
-- First, let's check and update the RLS policies for eureka_form_submissions to allow anonymous submissions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Users can create their own eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Users can update their own eureka submissions" ON public.eureka_form_submissions;
DROP POLICY IF EXISTS "Admins can view all eureka submissions" ON public.eureka_form_submissions;

-- Create new policies that allow anonymous access for public submissions
CREATE POLICY "Allow anonymous inserts for public submissions" 
  ON public.eureka_form_submissions 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their own eureka submissions" 
  ON public.eureka_form_submissions 
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR 
    auth.uid() IS NULL 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can update their own eureka submissions" 
  ON public.eureka_form_submissions 
  FOR UPDATE 
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Ensure the trigger exists for auto-analysis
CREATE TRIGGER auto_analyze_eureka_trigger
  AFTER INSERT ON public.eureka_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_analyze_eureka_submission();
