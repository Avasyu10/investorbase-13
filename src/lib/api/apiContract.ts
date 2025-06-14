
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

// Additional types that were missing
export interface CompanyListItem extends Company {}

export interface SectionDetailed extends Section {
  details?: SectionDetail[];
}

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CompanyFilterParams {
  search?: string;
  industry?: string;
  stage?: string;
  minScore?: number;
  maxScore?: number;
}

export interface CompanyCreateRequest {
  name: string;
  source?: string;
  assessment_points?: string[];
  overall_score?: number;
}

export interface CompanyUpdateRequest extends Partial<CompanyCreateRequest> {
  id: string;
}

export interface SectionCreateRequest {
  title: string;
  description?: string;
  score: number;
  type?: string;
  company_id: string;
}

export interface SectionUpdateRequest extends Partial<SectionCreateRequest> {
  id: string;
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

export enum SectionType {
  BUSINESS_MODEL = 'business_model',
  MARKET_ANALYSIS = 'market_analysis',
  TEAM = 'team',
  FINANCIALS = 'financials',
  PRODUCT = 'product',
  COMPETITIVE_ANALYSIS = 'competitive_analysis'
}

export const API_ENDPOINTS = {
  COMPANIES: '/api/companies',
  SECTIONS: '/api/sections',
  REPORTS: '/api/reports'
} as const;

export interface SectionBase extends BaseEntity {
  title: string;
  description?: string;
  score: number;
  type?: string;
}
