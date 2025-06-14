
export interface Company {
  id: string;
  name: string;
  description?: string;
  website?: string;
  stage?: string;
  industry?: string;
  introduction?: string;
  reportId?: string;
  report_id?: string;
  created_at: string;
  updated_at?: string;
  sections?: Section[];
  overall_score?: number;
  analysis_status?: string;
  linkedin_url?: string;
  linkedin_data?: any;
  user_id?: string;
}

export interface CompanyDetailed extends Company {
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  content: string;
  score?: number;
  strengths?: string[];
  weaknesses?: string[];
  company_id: string;
  created_at: string;
  updated_at?: string;
}

export interface Report {
  id: string;
  title: string;
  description?: string;
  pdf_url?: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  company_id?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  is_public_submission?: boolean;
  analysis_error?: string;
}

export interface PublicSubmission {
  id: string;
  title: string;
  description: string | null;
  company_stage: string | null;
  industry: string | null;
  website_url: string | null;
  created_at: string;
  form_slug: string;
  pdf_url: string | null;
  report_id: string | null;
  source: "email" | "email_pitch" | "public_form" | "barc_form";
  from_email?: string | null;
}
