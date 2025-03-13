
import { API_ENDPOINTS, ApiResponse, ApiError, CompanyListItem, CompanyDetailed, SectionDetailed } from './apiContract';

// API base URL - this should be configured based on environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Generic fetch function with error handling
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle error responses
      const error: ApiError = {
        status: response.status,
        message: data.message || 'An unknown error occurred',
        errors: data.errors,
      };
      
      throw error;
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    if ((error as ApiError).status) {
      throw error;
    }
    
    // Handle network errors
    throw {
      status: 0,
      message: 'Network error. Please check your connection.',
    } as ApiError;
  }
}

/**
 * API Client with specific methods for each endpoint
 */
export const apiClient = {
  // Companies
  getCompanies: async (): Promise<ApiResponse<CompanyListItem[]>> => {
    return fetchApi<CompanyListItem[]>(API_ENDPOINTS.GET_COMPANIES);
  },

  getCompany: async (companyId: number): Promise<ApiResponse<CompanyDetailed>> => {
    return fetchApi<CompanyDetailed>(API_ENDPOINTS.GET_COMPANY(companyId));
  },

  // Sections
  getSection: async (companyId: number, sectionId: string): Promise<ApiResponse<SectionDetailed>> => {
    return fetchApi<SectionDetailed>(API_ENDPOINTS.GET_SECTION(companyId, sectionId));
  },

  // Analysis
  getCompanyAnalysis: async (companyId: number): Promise<ApiResponse<CompanyDetailed>> => {
    return fetchApi<CompanyDetailed>(API_ENDPOINTS.GET_COMPANY_ANALYSIS(companyId));
  },
};
