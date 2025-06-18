
// Common interface for all submission types
export interface BaseSubmission {
  id: string;
  company_name: string;
  submitter_email: string;
  created_at: string;
  source: 'public_form' | 'barc_form' | 'email' | 'eureka_form';
  analysis_status?: string;
  form_slug?: string;
  sender_email?: string;
  from_email?: string;
  has_attachment?: boolean;
  analysis_result?: any;
  user_id?: string;
  company_id?: string;
}

// Public form submission interface
export interface PublicSubmission extends BaseSubmission {
  source: 'public_form';
  title: string;
  description?: string;
  company_stage?: string;
  industry?: string;
  founder_name?: string;
  founder_email?: string;
  website_url?: string;
}

// BARC form submission interface
export interface BarcSubmission extends BaseSubmission {
  source: 'barc_form';
  company_type?: string;
  company_registration_type?: string;
  executive_summary?: string;
  question_1?: string;
  question_2?: string;
  question_3?: string;
  question_4?: string;
  question_5?: string;
  poc_name?: string;
  phoneno?: string;
  company_linkedin_url?: string;
  founder_linkedin_urls?: string[];
  report_id?: string;
}

// Eureka form submission interface
export interface EurekaSubmission extends BaseSubmission {
  source: 'eureka_form';
  company_type?: string;
  company_registration_type?: string;
  executive_summary?: string;
  question_1?: string;
  question_2?: string;
  question_3?: string;
  question_4?: string;
  question_5?: string;
  poc_name?: string;
  phoneno?: string;
  company_linkedin_url?: string;
  founder_linkedin_urls?: string[];
  report_id?: string;
}

// Email submission interface
export interface EmailSubmission extends BaseSubmission {
  source: 'email';
  sender_email: string;
  has_attachment?: boolean;
}

// Combined submission type
export type CombinedSubmission = PublicSubmission | BarcSubmission | EurekaSubmission | EmailSubmission;
