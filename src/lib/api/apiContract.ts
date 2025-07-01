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
  industry?: string;
  overall_score?: number;
  scoring_reason?: string;
  company_details?: { // Start of company_details object
    status?: string;
    // ... other company_details fields
  }; 

  report_id?: string; // Add this if not present, as CompanyInfoCard fetches it
  response_received?: string | null; // THIS IS THE CRITICAL LINE. Must be string | null.
  // Add any other fields your 'companies' table directly returns
  // that are relevant to the CompaniesTable or CompanyInfoCard.
  // For example, if you fetch 'poc_name', 'phonenumber', 'email' for IITBombay table
  poc_name?: string | null;
  phonenumber?: string | null;
  email?: string | null;
}

// Also ensure this interface exists if you use it in CompanyInfoCard
export interface AnalysisResult {
  companyInfo?: {
    stage: string;
    industry: string;
    website: string;
    description: string;
  };
  assessmentPoints?: string[];
  [key: string]: any; // Allow for other properties
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

export interface SectionDetailed extends Section {
  detailedContent: string;
  strengths: string[];
  weaknesses: string[];
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

// Additional types for API client
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CompanyFilterParams {
  search?: string;
  minScore?: number;
  maxScore?: number;
  source?: string;
}

export interface CompanyListItem extends Company {}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface SectionBase {
  id: string;
  title: string;
  type: string;
  score: number;
}

export interface CompanyCreateRequest {
  name: string;
  source?: string;
}

export interface CompanyUpdateRequest {
  name?: string;
  overall_score?: number;
  assessment_points?: string[];
}

export interface SectionCreateRequest {
  title: string;
  type: string;
  company_id: string;
}

export interface SectionUpdateRequest {
  title?: string;
  score?: number;
  description?: string;
}

export const API_ENDPOINTS = {
  COMPANIES: '/companies',
  SECTIONS: '/sections',
  REPORTS: '/reports',
} as const;

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

export type SectionType = 'problem' | 'solution' | 'market' | 'team' | 'financials' | 'traction' | 'ask';
