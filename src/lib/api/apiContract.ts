
// HTTP Method enum
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

// API Endpoints
export const API_ENDPOINTS = {
  GET_COMPANIES: '/companies',
  GET_COMPANY: (id: number) => `/companies/${id}`,
  CREATE_COMPANY: '/companies',
  UPDATE_COMPANY: (id: number) => `/companies/${id}`,
  DELETE_COMPANY: (id: number) => `/companies/${id}`,
  
  GET_SECTIONS: (companyId: number) => `/companies/${companyId}/sections`,
  GET_SECTION: (companyId: number, sectionId: number | string) => `/companies/${companyId}/sections/${sectionId}`,
  CREATE_SECTION: (companyId: number) => `/companies/${companyId}/sections`,
  UPDATE_SECTION: (companyId: number, sectionId: number | string) => `/companies/${companyId}/sections/${sectionId}`,
  DELETE_SECTION: (companyId: number, sectionId: number | string) => `/companies/${companyId}/sections/${sectionId}`,
  
  GET_COMPANY_ANALYSIS: (companyId: number) => `/companies/${companyId}/analysis`,
};

// API Response and Error types
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: any[];
  code?: string;
}

// Base entity interface for models
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Pagination and filtering
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
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

export interface CompanyFilterParams {
  search?: string;
  minScore?: number;
  maxScore?: number;
}

// Section type enum
export type SectionType = 
  'PROBLEM' | 
  'MARKET' | 
  'SOLUTION' | 
  'PRODUCT' | 
  'COMPETITIVE_LANDSCAPE' | 
  'TRACTION' | 
  'BUSINESS_MODEL' | 
  'GTM_STRATEGY' | 
  'TEAM' | 
  'FINANCIALS' | 
  'ASK';

// Company request types
export interface CompanyCreateRequest {
  name: string;
  description?: string;
  overallScore?: number;
}

export interface CompanyUpdateRequest {
  name?: string;
  description?: string;
  overallScore?: number;
}

// Section request types
export interface SectionCreateRequest {
  title: string;
  type: SectionType;
  description?: string;
  score?: number;
}

export interface SectionUpdateRequest {
  title?: string;
  type?: SectionType;
  description?: string;
  score?: number;
}

// Basic company list item
export interface CompanyListItem {
  id: string;
  name: string;
  overallScore: number;
  createdAt: string;
  updatedAt: string;
  score?: number; // For backward compatibility
  assessmentPoints?: any[];
  source?: string;
}

// Section base interface
export interface SectionBase {
  id: string;
  type: string;
  title: string;
  score: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketInsight {
  headline: string;
  content: string;
  source?: string;
  url?: string;
  title?: string; // For backward compatibility
}

export interface NewsItem {
  headline: string;
  content: string;
  source?: string;
  url?: string;
  title?: string; // For backward compatibility
}

export interface Company {
  id: string;
  name: string;
  overallScore: number;
  createdAt: string;
  updatedAt: string;
  score: number; // For backward compatibility
  assessmentPoints: any[];
  reportId: string | null;
  perplexityResponse: any;
  perplexityPrompt: string | null;
  perplexityRequestedAt: string | null;
  source: string;
}

export interface CompanyDetailed extends Company {
  sections: Section[];
  description?: string; // Added description field
}

export interface Section {
  id: string;
  type: string;
  title: string;
  score: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDetailed extends Section {
  strengths: string[];
  weaknesses: string[];
  detailedContent: string;
}

export interface Report {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentPoint {
  id: string;
  label: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export type SortOrder = 'asc' | 'desc';
