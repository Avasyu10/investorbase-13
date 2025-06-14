
import apiClient from './apiClient';
import { 
  mockCompanies, 
  mockCompanyDetails, 
  getMockSectionDetails,
  getMockCompanies
} from './mockApi';
import { 
  ApiResponse, 
  PaginatedResponse,
  CompanyListItem, 
  CompanyDetailed, 
  SectionDetailed,
  PaginationParams,
  CompanyFilterParams
} from './apiContract';

// Environment-aware mock API configuration
const USE_MOCK_API = process.env.NODE_ENV === 'development' || !process.env.VITE_API_BASE_URL;

// Safe API Client that handles both mock and real API gracefully
const api = {
  // Companies
  getCompanies: async (params?: PaginationParams & CompanyFilterParams): Promise<ApiResponse<CompanyListItem[]>> => {
    try {
      if (USE_MOCK_API) {
        // Use mock data
        const response = await getMockCompanies(params);
        return {
          data: response.data,
          status: 200,
        };
      }
      // Use real API
      const response = await apiClient.getCompanies(params);
      // Ensure we return the correct format
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      return {
        data,
        status: response.status,
        message: response.message,
      };
    } catch (error) {
      console.warn('API error, falling back to mock data:', error);
      // Fallback to mock data on error
      const response = await getMockCompanies(params);
      return {
        data: response.data,
        status: 200,
      };
    }
  },

  getCompany: async (companyId: string): Promise<ApiResponse<CompanyDetailed>> => {
    try {
      if (USE_MOCK_API) {
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
      return await apiClient.getCompany(companyId);
    } catch (error) {
      // Fallback to mock data on error
      const company = mockCompanyDetails[companyId];
      if (company) {
        return {
          data: company,
          status: 200,
        };
      }
      throw error;
    }
  },

  // Sections
  getSection: async (companyId: string, sectionId: string): Promise<ApiResponse<SectionDetailed>> => {
    try {
      if (USE_MOCK_API) {
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
      return await apiClient.getSection(companyId, sectionId);
    } catch (error) {
      // Fallback to mock data on error
      const section = await getMockSectionDetails(companyId, sectionId);
      if (section) {
        return {
          data: section,
          status: 200,
        };
      }
      throw error;
    }
  },

  // Analysis
  getCompanyAnalysis: async (companyId: string): Promise<ApiResponse<CompanyDetailed>> => {
    try {
      if (USE_MOCK_API) {
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
      return await apiClient.getCompanyAnalysis(companyId);
    } catch (error) {
      // Fallback to mock data on error
      const company = mockCompanyDetails[companyId];
      if (company) {
        return {
          data: company,
          status: 200,
        };
      }
      throw error;
    }
  },
};

export default api;
