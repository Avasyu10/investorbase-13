
import apiClient from './apiClient';
import { 
  mockCompanies, 
  mockCompanyDetails, 
  getMockSectionDetails,
  getMockCompanies
} from './mockApi';
import { 
  ApiResponse, 
  CompanyListItem, 
  CompanyDetailed, 
  SectionDetailed,
  PaginationParams,
  CompanyFilterParams
} from './apiContract';

// Environment-safe way to check for mock mode
const getUseMockApi = (): boolean => {
  if (typeof window === 'undefined') {
    // Server-side rendering or build time - default to false
    return false;
  }
  
  // Check for environment variable or default to false for production builds
  const envVar = import.meta.env?.VITE_USE_MOCK_API;
  return envVar === 'true' || envVar === true;
};

// API Client that decides whether to use real or mock API
const api = {
  // Companies
  getCompanies: async (params?: PaginationParams & CompanyFilterParams): Promise<ApiResponse<CompanyListItem[]>> => {
    try {
      const useMockApi = getUseMockApi();
      
      if (useMockApi) {
        // Use mock data
        const response = await getMockCompanies(params);
        return {
          data: response.data,
          status: 200,
        };
      }
      
      // Use real API
      try {
        const response = await apiClient.getCompanies(params);
        return response as ApiResponse<CompanyListItem[]>;
      } catch (apiError) {
        console.warn('API client failed, falling back to empty response:', apiError);
        return {
          data: [],
          status: 500,
          message: 'API temporarily unavailable'
        };
      }
    } catch (error) {
      console.error('Error in getCompanies:', error);
      return {
        data: [],
        status: 500,
        message: 'Failed to fetch companies'
      };
    }
  },

  getCompany: async (companyId: string): Promise<ApiResponse<CompanyDetailed>> => {
    try {
      const useMockApi = getUseMockApi();
      
      if (useMockApi) {
        // Use mock data
        const company = mockCompanyDetails[companyId];
        if (!company) {
          throw {
            status: 404,
            message: 'Company not found',
          };
        }
        return {
          data: company,
          status: 200,
        };
      }
      
      // Use real API
      return apiClient.getCompany(companyId);
    } catch (error) {
      console.error('Error in getCompany:', error);
      throw error;
    }
  },

  // Sections
  getSection: async (companyId: string, sectionId: string): Promise<ApiResponse<SectionDetailed>> => {
    try {
      const useMockApi = getUseMockApi();
      
      if (useMockApi) {
        // Use mock data
        const section = await getMockSectionDetails(companyId, sectionId);
        if (!section) {
          throw {
            status: 404,
            message: 'Section not found',
          };
        }
        return {
          data: section,
          status: 200,
        };
      }
      
      // Use real API
      return apiClient.getSection(companyId, sectionId);
    } catch (error) {
      console.error('Error in getSection:', error);
      throw error;
    }
  },

  // Analysis
  getCompanyAnalysis: async (companyId: string): Promise<ApiResponse<CompanyDetailed>> => {
    try {
      const useMockApi = getUseMockApi();
      
      if (useMockApi) {
        // For mock data, analysis is the same as company details
        const company = mockCompanyDetails[companyId];
        if (!company) {
          throw {
            status: 404,
            message: 'Company analysis not found',
          };
        }
        return {
          data: company,
          status: 200,
        };
      }
      
      // Use real API
      return apiClient.getCompanyAnalysis(companyId);
    } catch (error) {
      console.error('Error in getCompanyAnalysis:', error);
      throw error;
    }
  },
};

export default api;
