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

export interface CompanyListItem {
  id: number;
  name: string;
  overallScore: number;
  score?: number;
  assessmentPoints?: string[];
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionBase extends Section {}

export interface SectionDetailed extends Section {
  detailedContent?: string;
  strengths?: string[];
  weaknesses?: string[];
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: any;
  code?: string;
}

export interface BaseEntity {
  id: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface CompanyFilterParams {
  search?: string;
  minScore?: number;
  maxScore?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CompanyCreateRequest {
  name: string;
  // Add additional properties as needed
}

export interface CompanyUpdateRequest {
  name?: string;
  overallScore?: number;
  // Add additional properties as needed
}

export interface SectionCreateRequest {
  title: string;
  type: string;
  description?: string;
  score: number;
}

export interface SectionUpdateRequest {
  title?: string;
  type?: string;
  description?: string;
  score?: number;
}

export const API_ENDPOINTS = {
  GET_COMPANIES: '/companies',
  GET_COMPANY: (id: number) => `/companies/${id}`,
  CREATE_COMPANY: '/companies',
  UPDATE_COMPANY: (id: number) => `/companies/${id}`,
  DELETE_COMPANY: (id: number) => `/companies/${id}`,
  
  GET_SECTIONS: (companyId: number) => `/companies/${companyId}/sections`,
  GET_SECTION: (companyId: number, sectionId: number | string) => 
    `/companies/${companyId}/sections/${sectionId}`,
  CREATE_SECTION: (companyId: number) => `/companies/${companyId}/sections`,
  UPDATE_SECTION: (companyId: number, sectionId: number | string) => 
    `/companies/${companyId}/sections/${sectionId}`,
  DELETE_SECTION: (companyId: number, sectionId: number | string) => 
    `/companies/${companyId}/sections/${sectionId}`,
  
  GET_COMPANY_ANALYSIS: (companyId: number) => `/companies/${companyId}/analysis`,
};

export enum SectionType {
  PROBLEM = 'PROBLEM',
  MARKET = 'MARKET',
  SOLUTION = 'SOLUTION',
  PRODUCT = 'PRODUCT',
  COMPETITIVE_LANDSCAPE = 'COMPETITIVE_LANDSCAPE',
  TRACTION = 'TRACTION',
  BUSINESS_MODEL = 'BUSINESS_MODEL',
  GTM_STRATEGY = 'GTM_STRATEGY',
  TEAM = 'TEAM',
  FINANCIALS = 'FINANCIALS',
  ASK = 'ASK'
}
