
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

// Build-safe API base URL configuration
const getApiBaseUrl = (): string => {
  // In build environment, we might not have access to import.meta.env
  if (typeof window === 'undefined') {
    return 'http://localhost:3000'; // Safe fallback for SSR/build
  }
  
  try {
    return import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000';
  } catch (error) {
    console.warn('Error accessing environment variables:', error);
    return 'http://localhost:3000';
  }
};

/**
 * Generic fetch function with comprehensive error handling
 */
async function fetchApi<T>(
  endpoint: string, 
  method: HttpMethod = HttpMethod.GET,
  data?: any, 
  params?: Record<string, any>
): Promise<ApiResponse<T>> {
  // Build-time safety check
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    console.warn('fetchApi called in non-browser environment');
    throw {
      status: 0,
      message: 'API not available in current environment',
    } as ApiError;
  }

  try {
    const API_BASE_URL = getApiBaseUrl();
    
    // Build URL with query parameters if provided
    let url = `${API_BASE_URL}${endpoint}`;
    if (params && typeof params === 'object') {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
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
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (jsonError) {
      console.warn('Failed to parse response as JSON:', jsonError);
      responseData = {};
    }

    if (!response.ok) {
      // Handle error responses
      const error: ApiError = {
        status: response.status,
        message: responseData?.message || `HTTP ${response.status}: ${response.statusText}`,
        details: responseData?.details,
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
    console.error('Network error in fetchApi:', error);
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
    if (!companyId || typeof companyId !== 'string') {
      throw {
        status: 400,
        message: 'Invalid company ID provided',
      } as ApiError;
    }
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}`);
  },

  createCompany: async (data: CompanyCreateRequest): Promise<ApiResponse<CompanyDetailed>> => {
    return fetchApi(API_ENDPOINTS.COMPANIES, HttpMethod.POST, data);
  },

  updateCompany: async (
    companyId: string, 
    data: CompanyUpdateRequest
  ): Promise<ApiResponse<CompanyDetailed>> => {
    if (!companyId || typeof companyId !== 'string') {
      throw {
        status: 400,
        message: 'Invalid company ID provided',
      } as ApiError;
    }
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}`, HttpMethod.PUT, data);
  },

  deleteCompany: async (companyId: string): Promise<ApiResponse<void>> => {
    if (!companyId || typeof companyId !== 'string') {
      throw {
        status: 400,
        message: 'Invalid company ID provided',
      } as ApiError;
    }
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}`, HttpMethod.DELETE);
  },

  // Sections
  getSections: async (companyId: string): Promise<ApiResponse<SectionBase[]>> => {
    if (!companyId || typeof companyId !== 'string') {
      throw {
        status: 400,
        message: 'Invalid company ID provided',
      } as ApiError;
    }
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}${API_ENDPOINTS.SECTIONS}`);
  },

  getSection: async (companyId: string, sectionId: string): Promise<ApiResponse<SectionDetailed>> => {
    if (!companyId || !sectionId || typeof companyId !== 'string' || typeof sectionId !== 'string') {
      throw {
        status: 400,
        message: 'Invalid company ID or section ID provided',
      } as ApiError;
    }
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}${API_ENDPOINTS.SECTIONS}/${sectionId}`);
  },

  createSection: async (
    companyId: string, 
    data: SectionCreateRequest
  ): Promise<ApiResponse<SectionDetailed>> => {
    if (!companyId || typeof companyId !== 'string') {
      throw {
        status: 400,
        message: 'Invalid company ID provided',
      } as ApiError;
    }
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}${API_ENDPOINTS.SECTIONS}`, HttpMethod.POST, data);
  },

  updateSection: async (
    companyId: string, 
    sectionId: string, 
    data: SectionUpdateRequest
  ): Promise<ApiResponse<SectionDetailed>> => {
    if (!companyId || !sectionId || typeof companyId !== 'string' || typeof sectionId !== 'string') {
      throw {
        status: 400,
        message: 'Invalid company ID or section ID provided',
      } as ApiError;
    }
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}${API_ENDPOINTS.SECTIONS}/${sectionId}`, HttpMethod.PUT, data);
  },

  deleteSection: async (companyId: string, sectionId: string): Promise<ApiResponse<void>> => {
    if (!companyId || !sectionId || typeof companyId !== 'string' || typeof sectionId !== 'string') {
      throw {
        status: 400,
        message: 'Invalid company ID or section ID provided',
      } as ApiError;
    }
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}${API_ENDPOINTS.SECTIONS}/${sectionId}`, HttpMethod.DELETE);
  },

  // Analysis
  getCompanyAnalysis: async (companyId: string): Promise<ApiResponse<CompanyDetailed>> => {
    if (!companyId || typeof companyId !== 'string') {
      throw {
        status: 400,
        message: 'Invalid company ID provided',
      } as ApiError;
    }
    return fetchApi(`${API_ENDPOINTS.COMPANIES}/${companyId}/analysis`);
  },
};

export default apiClient;
