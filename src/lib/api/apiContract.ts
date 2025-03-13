
/**
 * API Contract
 * 
 * This file defines the API contract between the frontend and backend.
 * It includes TypeScript interfaces for all data structures and API endpoints.
 */

// Base data types (matching our current model)
export interface CompanyBase {
  id: number;
  name: string;
  overallScore: number;
}

export interface CompanyListItem extends CompanyBase {
  score: number; // For compatibility with current UI
}

export interface SectionBase {
  id: string;
  type: SectionType;
  title: string;
  score: number;
  description: string;
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

export interface CompanyDetailed extends CompanyBase {
  sections: SectionBase[];
  assessmentPoints: string[];
}

export interface SectionDetailed extends SectionBase {
  strengths: string[];
  weaknesses: string[];
  detailedContent: string;
}

// API Endpoints
export const API_ENDPOINTS = {
  // Companies
  GET_COMPANIES: '/api/companies',
  GET_COMPANY: (id: number) => `/api/companies/${id}`,
  
  // Sections
  GET_SECTION: (companyId: number, sectionId: string) => 
    `/api/companies/${companyId}/sections/${sectionId}`,
  
  // Analysis
  GET_COMPANY_ANALYSIS: (companyId: number) => 
    `/api/companies/${companyId}/analysis`,
};

// Response types
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
}
