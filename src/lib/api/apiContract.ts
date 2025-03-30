
export interface Section {
  id: string | number;
  title: string;
  type: string;
  score: number;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyDetailed {
  id: string | number;
  name: string;
  overallScore: number;
  assessmentPoints?: string[];
  sections: Section[];
  reportId?: string;
  perplexityResponse?: string;
  perplexityRequestedAt?: string;
  introduction?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id: number;
  name: string;
}

export interface Report {
  id: string;
  name: string;
  companyId: number;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
}

export interface PublicFormSubmission {
  id: string;
  report_id: string;
  website_url: string;
  company_stage: string;
  industry: string;
  founder_linkedin_profiles: string[];
  description: string;
  created_at: string;
}
