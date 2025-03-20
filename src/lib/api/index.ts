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

// Set to false to use real API
const USE_MOCK_API = false;
// Set to true to use mock API as a fallback when real API fails
const USE_MOCK_API_FALLBACK = true;

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
    try {
      const response = await apiClient.getCompanies(params);
      return response as ApiResponse<CompanyListItem[]>;
    } catch (error) {
      // Fallback to mock data if enabled
      if (USE_MOCK_API_FALLBACK) {
        console.log('[DEBUG API] Real API failed, falling back to mock data');
        try {
          const response = await getMockCompanies(params);
          console.log('[DEBUG API] Mock fallback data retrieved successfully');
          return {
            data: response.data,
            status: 200,
          };
        } catch (mockErr) {
          console.error('[DEBUG API] Even mock fallback failed:', mockErr);
          throw mockErr;
        }
      }
      throw error;
    }
  },

  getCompany: async (companyId: number | string): Promise<ApiResponse<CompanyDetailed>> => {
    console.log('[DEBUG API] getCompany called with ID:', companyId, 'Type:', typeof companyId);
    
    // We'll handle all IDs as strings to avoid type conversion issues
    const stringCompanyId = companyId.toString();
    
    if (USE_MOCK_API) {
      // Use mock data - need to convert to number for mock lookup
      console.log('[DEBUG API] Using mock data for getCompany');
      let mockId: number;
      
      // Try to convert string ID to number for mock data lookup
      if (typeof companyId === 'string') {
        // Check if it's a UUID format
        if (/^[0-9a-f]{8}-/.test(companyId)) {
          // For UUIDs, extract first part and convert to decimal
          const firstPart = companyId.split('-')[0];
          mockId = parseInt(firstPart, 16);
        } else {
          // Regular numeric string
          mockId = parseInt(companyId);
        }
      } else {
        // Already a number
        mockId = companyId;
      }
      
      if (isNaN(mockId)) {
        console.error('[DEBUG API] Invalid company ID format:', companyId);
        throw {
          status: 400,
          message: 'Invalid company ID format',
        };
      }
      
      const company = mockCompanyDetails[mockId];
      console.log('[DEBUG API] Mock company found:', company ? 'Yes' : 'No');
      
      if (!company) {
        console.error('[DEBUG API] Company not found in mock data for ID:', mockId);
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
    try {
      // Handle all IDs as strings when passing to apiClient
      return await apiClient.getCompany(stringCompanyId);
    } catch (error) {
      // Fallback to mock data if enabled
      if (USE_MOCK_API_FALLBACK) {
        console.log('[DEBUG API] Real API failed, checking mock data as fallback');
        
        let mockId: number;
        
        // Try to convert string ID to number for mock data lookup
        if (typeof companyId === 'string') {
          // Check if it's a UUID format
          if (/^[0-9a-f]{8}-/.test(companyId)) {
            // For UUIDs, extract first part and convert to decimal
            const firstPart = companyId.split('-')[0];
            mockId = parseInt(firstPart, 16);
          } else {
            // Regular numeric string
            mockId = parseInt(companyId);
          }
        } else {
          // Already a number
          mockId = companyId;
        }
        
        if (!isNaN(mockId)) {
          const company = mockCompanyDetails[mockId];
          
          if (company) {
            console.log('[DEBUG API] Found company in mock data:', company.name);
            return {
              data: company,
              status: 200,
            };
          }
        }
        
        console.log('[DEBUG API] Company not found in mock data either');
      }
      
      throw error;
    }
  },

  // Sections
  getSection: async (companyId: number | string, sectionId: string | number): Promise<ApiResponse<SectionDetailed>> => {
    // Convert everything to strings for consistent handling
    const stringCompanyId = companyId.toString();
    const stringSectionId = sectionId.toString();
    
    console.log('[DEBUG API] getSection called with companyId:', stringCompanyId, 'sectionId:', stringSectionId);
    
    if (USE_MOCK_API) {
      // For mock API, need to convert to number
      const mockCompanyId = parseInt(stringCompanyId);
      
      if (isNaN(mockCompanyId)) {
        console.error('[DEBUG API] Invalid company ID format for section lookup:', companyId);
        throw {
          status: 400,
          message: 'Invalid company ID format',
        };
      }
      
      // Use mock data
      console.log('[DEBUG API] Using mock data for getSection');
      try {
        const section = await getMockSectionDetails(mockCompanyId, sectionId);
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
    
    // Use real API with string IDs
    console.log('[DEBUG API] Using real API for getSection');
    try {
      return await apiClient.getSection(stringCompanyId, stringSectionId);
    } catch (error) {
      // Fallback to mock data if enabled
      if (USE_MOCK_API_FALLBACK) {
        console.log('[DEBUG API] Real API failed, checking mock data as fallback');
        try {
          const mockCompanyId = parseInt(stringCompanyId);
          
          if (!isNaN(mockCompanyId)) {
            const section = await getMockSectionDetails(mockCompanyId, sectionId);
            
            if (section) {
              console.log('[DEBUG API] Found section in mock data:', section.title);
              return {
                data: section,
                status: 200,
              };
            }
          }
          
          console.log('[DEBUG API] Section not found in mock data either');
        } catch (mockErr) {
          console.error('[DEBUG API] Error in mock fallback:', mockErr);
        }
      }
      
      throw error;
    }
  },

  // Analysis
  getCompanyAnalysis: async (companyId: number | string): Promise<ApiResponse<CompanyDetailed>> => {
    // Convert to string for consistent handling
    const stringCompanyId = companyId.toString();
    
    console.log('[DEBUG API] getCompanyAnalysis called with ID:', stringCompanyId);
    
    if (USE_MOCK_API) {
      // For mock data, we need to convert to number
      const mockId = parseInt(stringCompanyId);
      
      if (isNaN(mockId)) {
        console.error('[DEBUG API] Invalid company ID format for analysis:', companyId);
        throw {
          status: 400,
          message: 'Invalid company ID format',
        };
      }
      
      // Use mock data
      console.log('[DEBUG API] Using mock data for getCompanyAnalysis');
      const company = mockCompanyDetails[mockId];
      console.log('[DEBUG API] Mock company analysis found:', company ? 'Yes' : 'No');
      
      if (!company) {
        console.error('[DEBUG API] Company analysis not found in mock data for ID:', mockId);
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
    
    // Use real API with string ID
    console.log('[DEBUG API] Using real API for getCompanyAnalysis');
    try {
      return await apiClient.getCompanyAnalysis(stringCompanyId);
    } catch (error) {
      // Fallback to mock data if enabled
      if (USE_MOCK_API_FALLBACK) {
        console.log('[DEBUG API] Real API failed, checking mock data as fallback');
        
        const mockId = parseInt(stringCompanyId);
        
        if (!isNaN(mockId)) {
          const company = mockCompanyDetails[mockId];
          
          if (company) {
            console.log('[DEBUG API] Found company analysis in mock data:', company.name);
            return {
              data: company,
              status: 200,
            };
          }
        }
        
        console.log('[DEBUG API] Company analysis not found in mock data either');
      }
      
      throw error;
    }
  },
};

export default api;
