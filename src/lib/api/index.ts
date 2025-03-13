
import { apiClient } from './apiClient';
import { mockCompanies, mockCompanyDetails, getMockSectionDetails } from './mockApi';
import { CompanyListItem, CompanyDetailed, SectionDetailed, ApiResponse } from './apiContract';

// Check if we should use mock data or real API
const USE_MOCK_API = true; // Set to false when ready to connect to real backend

// API Client that decides whether to use real or mock API
const api = {
  // Companies
  getCompanies: async (): Promise<ApiResponse<CompanyListItem[]>> => {
    if (USE_MOCK_API) {
      // Use mock data
      return {
        data: mockCompanies,
        status: 200,
      };
    }
    // Use real API
    return apiClient.getCompanies();
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
  getSection: async (companyId: number, sectionId: string): Promise<ApiResponse<SectionDetailed>> => {
    if (USE_MOCK_API) {
      // Use mock data
      const section = getMockSectionDetails(companyId, sectionId);
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
