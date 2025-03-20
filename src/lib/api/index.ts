
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

// Force mock API usage to ensure data is returned even if Supabase fails
const USE_MOCK_API = true;  

// API Client that decides whether to use real or mock API
const api = {
  // Companies
  getCompanies: async (params?: PaginationParams & CompanyFilterParams): Promise<ApiResponse<CompanyListItem[]>> => {
    console.log('[DEBUG API] getCompanies called with params:', params);
    
    if (USE_MOCK_API) {
      // Use mock data
      console.log('[DEBUG API] Using mock data for getCompanies');
      try {
        const response = await getMockCompanies(params);
        console.log('[DEBUG API] Mock data retrieved successfully, items:', response.data.length);
        return {
          data: response.data,
          status: 200,
        };
      } catch (err) {
        console.error('[DEBUG API] Error getting mock companies:', err);
        throw err;
      }
    }
    // Use real API
    console.log('[DEBUG API] Using real API for getCompanies');
    const response = await apiClient.getCompanies(params);
    return response as ApiResponse<CompanyListItem[]>;
  },

  getCompany: async (companyId: number): Promise<ApiResponse<CompanyDetailed>> => {
    console.log('[DEBUG API] getCompany called with ID:', companyId, 'Type:', typeof companyId);
    
    if (USE_MOCK_API) {
      // Use mock data
      console.log('[DEBUG API] Using mock data for getCompany');
      const company = mockCompanyDetails[companyId];
      console.log('[DEBUG API] Mock company found:', company ? 'Yes' : 'No');
      
      if (!company) {
        console.error('[DEBUG API] Company not found in mock data for ID:', companyId);
        throw {
          status: 404,
          message: 'Company not found',
        };
      }
      
      console.log('[DEBUG API] Returning mock company:', company.name);
      return {
        data: company,
        status: 200,
      };
    }
    // Use real API
    console.log('[DEBUG API] Using real API for getCompany');
    return apiClient.getCompany(companyId);
  },

  // Sections
  getSection: async (companyId: number, sectionId: string | number): Promise<ApiResponse<SectionDetailed>> => {
    console.log('[DEBUG API] getSection called with companyId:', companyId, 'sectionId:', sectionId);
    console.log('[DEBUG API] Parameter types - companyId:', typeof companyId, 'sectionId:', typeof sectionId);
    
    if (USE_MOCK_API) {
      // Use mock data
      console.log('[DEBUG API] Using mock data for getSection');
      try {
        const section = await getMockSectionDetails(companyId, sectionId);
        console.log('[DEBUG API] Mock section found:', section ? 'Yes' : 'No');
        
        if (!section) {
          console.error('[DEBUG API] Section not found in mock data');
          throw {
            status: 404,
            message: 'Section not found',
          };
        }
        
        console.log('[DEBUG API] Returning mock section:', section.title);
        return {
          data: section,
          status: 200,
        };
      } catch (err) {
        console.error('[DEBUG API] Error in getMockSectionDetails:', err);
        throw err;
      }
    }
    // Use real API
    console.log('[DEBUG API] Using real API for getSection');
    return apiClient.getSection(companyId, sectionId);
  },

  // Analysis
  getCompanyAnalysis: async (companyId: number): Promise<ApiResponse<CompanyDetailed>> => {
    console.log('[DEBUG API] getCompanyAnalysis called with ID:', companyId);
    
    if (USE_MOCK_API) {
      // For mock data, analysis is the same as company details
      console.log('[DEBUG API] Using mock data for getCompanyAnalysis');
      const company = mockCompanyDetails[companyId];
      console.log('[DEBUG API] Mock company analysis found:', company ? 'Yes' : 'No');
      
      if (!company) {
        console.error('[DEBUG API] Company analysis not found in mock data for ID:', companyId);
        throw {
          status: 404,
          message: 'Company analysis not found',
        };
      }
      
      console.log('[DEBUG API] Returning mock company analysis for:', company.name);
      return {
        data: company,
        status: 200,
      };
    }
    // Use real API
    console.log('[DEBUG API] Using real API for getCompanyAnalysis');
    return apiClient.getCompanyAnalysis(companyId);
  },
};

export default api;
