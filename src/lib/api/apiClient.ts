
import { supabase } from "@/integrations/supabase/client";
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

// Create a type-safe HTTP client for API requests
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: HttpMethod,
    url: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      const config: RequestInit = {
        method: method.toString(),
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data && (method === HttpMethod.POST || method === HttpMethod.PUT || method === HttpMethod.PATCH)) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseUrl}${url}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          code: response.status,
          details: errorData
        } as ApiError;
      }

      const result = await response.json();
      return {
        data: result,
        success: true
      };
    } catch (error) {
      if ((error as ApiError).message) {
        throw error;
      }
      throw {
        message: 'Network error occurred',
        code: 'NETWORK_ERROR',
        details: error
      } as ApiError;
    }
  }

  // Company endpoints
  async getCompanies(params?: PaginationParams & CompanyFilterParams): Promise<ApiResponse<PaginatedResponse<CompanyListItem>>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const url = `${API_ENDPOINTS.COMPANIES}?${queryParams.toString()}`;
    return this.request<PaginatedResponse<CompanyListItem>>(HttpMethod.GET, url);
  }

  async getCompanyById(id: string): Promise<ApiResponse<CompanyDetailed>> {
    return this.request<CompanyDetailed>(HttpMethod.GET, API_ENDPOINTS.COMPANY_DETAILS(id));
  }

  async createCompany(company: CompanyCreateRequest): Promise<ApiResponse<CompanyDetailed>> {
    return this.request<CompanyDetailed>(HttpMethod.POST, API_ENDPOINTS.COMPANIES, company);
  }

  async updateCompany(company: CompanyUpdateRequest): Promise<ApiResponse<CompanyDetailed>> {
    return this.request<CompanyDetailed>(HttpMethod.PUT, API_ENDPOINTS.COMPANY_DETAILS(company.id), company);
  }

  // Section endpoints
  async getSectionById(id: string): Promise<ApiResponse<SectionDetailed>> {
    return this.request<SectionDetailed>(HttpMethod.GET, API_ENDPOINTS.SECTION_DETAILS(id));
  }

  async createSection(section: SectionCreateRequest): Promise<ApiResponse<SectionDetailed>> {
    return this.request<SectionDetailed>(HttpMethod.POST, API_ENDPOINTS.SECTIONS, section);
  }

  async updateSection(section: SectionUpdateRequest): Promise<ApiResponse<SectionDetailed>> {
    return this.request<SectionDetailed>(HttpMethod.PUT, API_ENDPOINTS.SECTION_DETAILS(section.id), section);
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();
export default apiClient;
