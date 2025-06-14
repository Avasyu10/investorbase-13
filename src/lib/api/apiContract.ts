
export interface Section {
  id: string;
  title: string;
  description: string;
  score: number;
  type?: string;
  section_type?: string;
  strengths?: string[];
  weaknesses?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  id: string;
  name: string;
  overall_score: number;
  assessment_points?: string[];
  source?: string;
  created_at?: string;
  updated_at?: string;
  report_id?: string;
  reportId?: string;
  user_id?: string;
  sections?: Section[];
  website?: string;
  stage?: string;
  industry?: string;
  introduction?: string;
}

export interface CompanyDetailed extends Company {
  sections: Section[];
}

export interface SectionDetail {
  id: string;
  section_id: string;
  detail_type: string;
  content: string;
  created_at?: string;
}

export interface Report {
  id: string;
  title: string;
  description?: string;
  pdf_url: string;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis_error?: string;
  created_at: string;
  user_id?: string;
  company_id?: string;
  submitter_email?: string;
  is_public_submission?: boolean;
  submission_form_id?: string;
}
