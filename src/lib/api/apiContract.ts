/**
 * API Contract
 * 
 * This file defines the API contract between the frontend and backend.
 * It includes TypeScript interfaces for all data structures and API endpoints.
 */

// Base data types
export interface BaseEntity {
  id: number;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface CompanyBase extends BaseEntity {
  name: string;
  overallScore: number; // 0-5 scale
  assessmentPoints?: string[]; // Add this property to ensure it's available
  description?: string; // Add description field to the base company interface
}

export interface CompanyListItem extends CompanyBase {
  // For compatibility with current UI
  score?: number;  
}

export type SectionType = 
  | "PROBLEM" 
  | "MARKET" 
  | "SOLUTION" 
  | "PRODUCT" 
  | "COMPETITIVE_LANDSCAPE" 
  | "TRACTION" 
  | "BUSINESS_MODEL" 
  | "GTM_STRATEGY" 
  | "TEAM" 
  | "FINANCIALS" 
  | "ASK";

export interface SectionBase extends BaseEntity {
  type: SectionType;
  title: string;
  score: number; // 0-5 scale
  description: string;
}

export interface CompanyDetailed extends CompanyBase {
  sections: SectionBase[];
  assessmentPoints: string[];
}

export interface SectionDetailed extends SectionBase {
  strengths: string[];
  weaknesses: string[];
  detailedContent: string;
}

// Request Payloads
export interface CompanyCreateRequest {
  name: string;
  // Initial assessment data if available
  sections?: Omit<SectionBase, keyof BaseEntity>[];
  assessmentPoints?: string[];
}

export interface CompanyUpdateRequest {
  name?: string;
  overallScore?: number;
  // Any other updatable fields
}

export interface SectionCreateRequest {
  type: SectionType;
  title: string;
  score: number;
  description: string;
  strengths?: string[];
  weaknesses?: string[];
  detailedContent?: string;
}

export interface SectionUpdateRequest {
  title?: string;
  score?: number;
  description?: string;
  strengths?: string[];
  weaknesses?: string[];
  detailedContent?: string;
}

// Pagination, Filtering and Sorting
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface CompanyFilterParams {
  search?: string;
  minScore?: number;
  maxScore?: number;
  sortBy?: 'name' | 'overallScore' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// API Endpoints
export const API_VERSION = 'v1';
export const BASE_URL = `/api/${API_VERSION}`;

export const API_ENDPOINTS = {
  // Companies
  GET_COMPANIES: `${BASE_URL}/companies`,
  GET_COMPANY: (id: number) => `${BASE_URL}/companies/${id}`,
  CREATE_COMPANY: `${BASE_URL}/companies`,
  UPDATE_COMPANY: (id: number) => `${BASE_URL}/companies/${id}`,
  DELETE_COMPANY: (id: number) => `${BASE_URL}/companies/${id}`,
  
  // Sections
  GET_SECTION: (companyId: number, sectionId: number | string) => 
    `${BASE_URL}/companies/${companyId}/sections/${sectionId}`,
  GET_SECTIONS: (companyId: number) =>
    `${BASE_URL}/companies/${companyId}/sections`,
  CREATE_SECTION: (companyId: number) =>
    `${BASE_URL}/companies/${companyId}/sections`,
  UPDATE_SECTION: (companyId: number, sectionId: number | string) =>
    `${BASE_URL}/companies/${companyId}/sections/${sectionId}`,
  DELETE_SECTION: (companyId: number, sectionId: number | string) =>
    `${BASE_URL}/companies/${companyId}/sections/${sectionId}`,
  
  // Analysis
  GET_COMPANY_ANALYSIS: (companyId: number) => 
    `${BASE_URL}/companies/${companyId}/analysis`,
};

// HTTP Methods
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

// Response types with pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Error response
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  code?: string; // For specific error codes
}

// Auth related
export interface AuthHeader {
  Authorization: string; // Format: "Bearer {token}"
}

export interface ApiRequestConfig {
  method: HttpMethod;
  headers?: AuthHeader & Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

// Endpoint method mapping
export const ENDPOINT_METHODS = {
  [API_ENDPOINTS.GET_COMPANIES]: HttpMethod.GET,
  [API_ENDPOINTS.CREATE_COMPANY]: HttpMethod.POST,
  // Define methods for all endpoints...
};
