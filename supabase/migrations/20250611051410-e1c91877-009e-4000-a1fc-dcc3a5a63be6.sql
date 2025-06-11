
-- Enable RLS on tables that have policies but RLS is not enabled
ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_form_submissions ENABLE ROW LEVEL SECURITY;

-- Check and enable RLS on other tables that might have policies but no RLS enabled
-- (These are commonly affected tables based on the codebase)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.end_of_day_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_thesis_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_pitch_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_profile_scrapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_submission_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_scrapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_pitch_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_scrapes ENABLE ROW LEVEL SECURITY;
