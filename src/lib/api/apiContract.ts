export interface User {
  id: string;
  full_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  is_admin?: boolean;
  is_iitbombay?: boolean;
  is_bits?: boolean | null;
  signup_source?: string | null;
}

export interface Report {
  id: string;
  title: string;
  description?: string;
  pdf_url: string;
  created_at: string;
  user_id?: string;
  company_id?: string;
  is_public_submission?: boolean;
  submitter_email?: string;
  analysis_status?: string;
  analysis_error?: string;
}

export interface Company {
  id: string;
  name: string;
  overall_score: number;
  created_at?: string;
  updated_at?: string;
  assessment_points?: string[];
  report_id?: string;
  source?: string;
  scoring_reason?: string;
  poc_name?: string;
  phonenumber?: string;
  email?: string;
  industry?: string;
  response_received?: string;
  deck_url?: string; // Add deck_url property
}

export interface PublicFormSubmission {
  id: string;
  created_at: string;
  title: string;
  description?: string;
  pdf_url?: string;
  industry?: string;
  company_linkedin?: string;
  company_type?: string;
  company_stage?: string;
  founder_name?: string;
  founder_linkedin_profiles?: string[];
  founder_email?: string;
  founder_contact?: string;
  founder_address?: string;
  founder_gender?: string;
  indian_citizen_shareholding?: string;
  dpiit_recognition_number?: string;
  registration_number?: string;
  employee_count?: number;
  funds_raised?: string;
  valuation?: string;
  last_fy_revenue?: string;
  last_quarter_revenue?: string;
  products_services?: string;
  question?: string;
  supplementary_materials_urls?: string[];
  submitter_email?: string;
  form_slug?: string;
  company_registration_type?: string;
  executive_summary?: string;
}

export interface PublicSubmissionForm {
  id: string;
  created_at: string;
  form_name: string;
  form_slug: string;
  form_type?: string;
  is_active: boolean;
  user_id: string;
  auto_analyze: boolean;
}

export interface Section {
  id: string;
  created_at: string;
  updated_at: string;
  company_id: string;
  title: string;
  description?: string;
  type: string;
  score: number;
  section_type?: string;
}

export interface SectionDetail {
  id: string;
  created_at: string;
  section_id: string;
  detail_type: string;
  content: string;
}

export interface InvestorResearch {
  id: string;
  created_at: string;
  updated_at: string;
  company_id: string;
  user_id: string;
  requested_at: string;
  completed_at?: string;
  prompt?: string;
  response?: string;
  research_summary?: string;
  market_insights?: any;
  news_highlights?: any;
  sources?: any;
  status: string;
  error_message?: string;
}
