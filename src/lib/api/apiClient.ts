
import { 
  API_ENDPOINTS, 
  HttpMethod,
  ApiResponse, 
  ApiError, 
  CompanyListItem, 
  CompanyDetailed, 
  SectionDetailed,
  SectionBase,
  PaginatedResponse,
  CompanyCreateRequest,
  CompanyUpdateRequest,
  SectionCreateRequest,
  SectionUpdateRequest,
  PaginationParams,
  CompanyFilterParams
} from './apiContract';

// API base URL - this should be configured based on environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Generic fetch function with error handling
 */
async function fetchApi<T>(
  endpoint: string, 
  method: HttpMethod = HttpMethod.GET,
  data?: any, 
  params?: Record<string, any>
): Promise<ApiResponse<T>> {
  try {
    // Build URL with query parameters if provided
    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
    }

    // Build request options
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if needed
        // 'Authorization': `Bearer ${getToken()}`,
      },
    };

    // Add request body for methods that support it
    if (data && [HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH].includes(method)) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      // Handle error responses
      const error: ApiError = {
        status: response.status,
        message: responseData.message || 'An unknown error occurred',
        details: responseData.details,
      };
      
      throw error;
    }

    return {
      data: responseData.data || responseData,
      status: response.status,
      message: responseData.message,
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
  getCompanies: async (
    params?: PaginationParams & CompanyFilterParams
  ): Promise<ApiResponse<PaginatedResponse<CompanyListItem> | CompanyListItem[]>> => {
    return fetchApi(API_ENDPOINTS.COMPANIES, HttpMethod.GET, undefined, params);
  },

  getCompany: async (companyId: string): Promise<ApiResponse<CompanyDetailed>> => {
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}`);
  },

  createCompany: async (data: CompanyCreateRequest): Promise<ApiResponse<CompanyDetailed>> => {
    return fetchApi(API_ENDPOINTS.COMPANIES, HttpMethod.POST, data);
  },

  updateCompany: async (
    companyId: string, 
    data: CompanyUpdateRequest
  ): Promise<ApiResponse<CompanyDetailed>> => {
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}`, HttpMethod.PUT, data);
  },

  deleteCompany: async (companyId: string): Promise<ApiResponse<void>> => {
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}`, HttpMethod.DELETE);
  },

  // Sections
  getSections: async (companyId: string): Promise<ApiResponse<SectionBase[]>> => {
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}${API_ENDPOINTS.SECTIONS}`);
  },

  getSection: async (companyId: string, sectionId: string): Promise<ApiResponse<SectionDetailed>> => {
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}${API_ENDPOINTS.SECTIONS}/${sectionId}`);
  },

  createSection: async (
    companyId: string, 
    data: SectionCreateRequest
  ): Promise<ApiResponse<SectionDetailed>> => {
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}${API_ENDPOINTS.SECTIONS}`, HttpMethod.POST, data);
  },

  updateSection: async (
    companyId: string, 
    sectionId: string, 
    data: SectionUpdateRequest
  ): Promise<ApiResponse<SectionDetailed>> => {
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}${API_ENDPOINTS.SECTIONS}/${sectionId}`, HttpMethod.PUT, data);
  },

  deleteSection: async (companyId: string, sectionId: string): Promise<ApiResponse<void>> => {
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}${API_ENDPOINTS.SECTIONS}/${sectionId}`, HttpMethod.DELETE);
  },

  // Analysis
  getCompanyAnalysis: async (companyId: string): Promise<ApiResponse<CompanyDetailed>> => {
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}/analysis`);
  },
};

export default apiClient;
