
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

// Check if we should use mock data or real API
// Set to false to ensure we're using real API in production
const USE_MOCK_API = false;

// API Client that decides whether to use real or mock API
const api = {
  // Companies
  getCompanies: async (params?: PaginationParams & CompanyFilterParams): Promise<ApiResponse<CompanyListItem[]>> => {
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
    return response as ApiResponse<CompanyListItem[]>;
  },

  getCompany: async (companyId: number): Promise<ApiResponse<CompanyDetailed>> => {
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
    return apiClient.getCompany(companyId);
  },

  // Sections
  getSection: async (companyId: number, sectionId: string | number): Promise<ApiResponse<SectionDetailed>> => {
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
    return apiClient.getSection(companyId, sectionId);
  },

  // Analysis
  getCompanyAnalysis: async (companyId: number): Promise<ApiResponse<CompanyDetailed>> => {
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
    return apiClient.getCompanyAnalysis(companyId);
  },
};

export default api;
