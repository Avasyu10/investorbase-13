
-- Add RLS policies for linkedin_profile_scrapes table to allow storage of scraped data
ALTER TABLE public.linkedin_profile_scrapes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert LinkedIn scrape data (needed for edge functions)
CREATE POLICY "Allow insert for linkedin scrapes" 
  ON public.linkedin_profile_scrapes 
  FOR INSERT 
  WITH CHECK (true);

-- Allow users to view LinkedIn scrapes for reports they have access to
CREATE POLICY "Users can view linkedin scrapes for accessible reports" 
  ON public.linkedin_profile_scrapes 
  FOR SELECT 
  USING (
    report_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id 
      AND public.can_access_report(r.user_id, r.is_public_submission, r.submitter_email)
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );
