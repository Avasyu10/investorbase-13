
-- Add RLS policies for public form submissions
-- These policies allow public access for form submissions and restricted access for other operations

-- Public form submissions: Allow anyone to insert, but only form owners to read
CREATE POLICY "Allow public insertion of form submissions"
  ON public.public_form_submissions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Form owners can view submissions to their forms"
  ON public.public_form_submissions
  FOR SELECT
  USING (
    form_slug IN (
      SELECT form_slug FROM public.public_submission_forms 
      WHERE user_id = auth.uid()
    )
  );

-- Public submission forms: Only owners can manage their forms
CREATE POLICY "Users can manage their own submission forms"
  ON public.public_submission_forms
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read active submission forms"
  ON public.public_submission_forms
  FOR SELECT
  USING (is_active = true);

-- Reports: Users can access their own reports and reports from public submissions assigned to them
CREATE POLICY "Users can access their own reports"
  ON public.reports
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow service role full access to reports"
  ON public.reports
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Companies: Users can access their own companies and companies from their reports
CREATE POLICY "Users can access their own companies"
  ON public.companies
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can access companies from their reports"
  ON public.companies
  FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM public.reports WHERE user_id = auth.uid()
    )
  );

-- Sections: Users can access sections of their companies
CREATE POLICY "Users can access sections of their companies"
  ON public.sections
  FOR ALL
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE report_id IN (
        SELECT id FROM public.reports WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE report_id IN (
        SELECT id FROM public.reports WHERE user_id = auth.uid()
      )
    )
  );

-- Section details: Users can access details of sections they own
CREATE POLICY "Users can access their section details"
  ON public.section_details
  FOR ALL
  USING (
    section_id IN (
      SELECT s.id FROM public.sections s
      JOIN public.companies c ON s.company_id = c.id
      WHERE c.user_id = auth.uid()
      OR c.report_id IN (
        SELECT id FROM public.reports WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    section_id IN (
      SELECT s.id FROM public.sections s
      JOIN public.companies c ON s.company_id = c.id
      WHERE c.user_id = auth.uid()
      OR c.report_id IN (
        SELECT id FROM public.reports WHERE user_id = auth.uid()
      )
    )
  );

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can access their own profile"
  ON public.profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Analysis limits: Users can only access their own limits
CREATE POLICY "Users can access their own analysis limits"
  ON public.analysis_limits
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Custom alerts: Users can only access their own alerts
CREATE POLICY "Users can access their own custom alerts"
  ON public.custom_alerts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- End of day alerts: Users can only access their own alerts
CREATE POLICY "Users can access their own end of day alerts"
  ON public.end_of_day_alerts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fund thesis analysis: Users can only access their own analysis
CREATE POLICY "Users can access their own fund thesis analysis"
  ON public.fund_thesis_analysis
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Investor pitch emails: Users can only access their own emails
CREATE POLICY "Users can access their own investor pitch emails"
  ON public.investor_pitch_emails
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Investor research: Users can access research for their companies
CREATE POLICY "Users can access investor research for their companies"
  ON public.investor_research
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- LinkedIn profile scrapes: Users can access scrapes for their reports
CREATE POLICY "Users can access LinkedIn scrapes for their reports"
  ON public.linkedin_profile_scrapes
  FOR ALL
  USING (
    report_id IN (
      SELECT id FROM public.reports WHERE user_id = auth.uid()
    )
    OR report_id IS NULL
  )
  WITH CHECK (
    report_id IN (
      SELECT id FROM public.reports WHERE user_id = auth.uid()
    )
    OR report_id IS NULL
  );

-- Market research: Users can access research for their companies  
CREATE POLICY "Users can access market research for their companies"
  ON public.market_research
  FOR ALL
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE report_id IN (
        SELECT id FROM public.reports WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE report_id IN (
        SELECT id FROM public.reports WHERE user_id = auth.uid()
      )
    )
  );

-- User feedback: Users can only access their own feedback
CREATE POLICY "Users can access their own feedback"
  ON public.user_feedback
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- VC profiles: Users can only access their own profile
CREATE POLICY "Users can access their own vc profile"
  ON public.vc_profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Website scrapes: Users can access scrapes for their reports
CREATE POLICY "Users can access website scrapes for their reports"
  ON public.website_scrapes
  FOR ALL
  USING (
    report_id IN (
      SELECT id FROM public.reports WHERE user_id = auth.uid()
    )
    OR report_id IS NULL
  )
  WITH CHECK (
    report_id IN (
      SELECT id FROM public.reports WHERE user_id = auth.uid()
    )
    OR report_id IS NULL
  );

-- Email submissions: Allow service role full access, users can access submissions that created reports assigned to them
CREATE POLICY "Service role can access all email submissions"
  ON public.email_submissions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can access email submissions for their reports"
  ON public.email_submissions
  FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM public.reports WHERE user_id = auth.uid()
    )
  );

-- Email pitch submissions: Similar to email submissions
CREATE POLICY "Service role can access all email pitch submissions"
  ON public.email_pitch_submissions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can access email pitch submissions for their reports"
  ON public.email_pitch_submissions
  FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM public.reports WHERE user_id = auth.uid()
    )
  );

-- Company scrapes: Allow access based on company ownership
CREATE POLICY "Users can access scrapes for their companies"
  ON public.company_scrapes
  FOR ALL
  USING (
    company_id IN (
      SELECT id::text FROM public.companies WHERE user_id = auth.uid()
    )
    OR company_id IS NULL
  )
  WITH CHECK (
    company_id IN (
      SELECT id::text FROM public.companies WHERE user_id = auth.uid()
    )
    OR company_id IS NULL
  );

-- Service role policies for edge functions
CREATE POLICY "Service role can access all tables"
  ON public.public_form_submissions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
