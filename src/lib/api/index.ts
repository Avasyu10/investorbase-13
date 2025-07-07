
// Main API exports and higher-level functions
import { 
  CompanyListItem, 
  CompanyDetailed, 
  SectionDetailed, 
  PaginationParams, 
  CompanyFilterParams,
  ApiResponse,
  PaginatedResponse 
} from './apiContract';
import { getMockCompanies, getMockSectionDetails, mockCompanyDetails } from './mockApi';

// Mock API implementations for development
export async function getCompanies(params?: PaginationParams & CompanyFilterParams): Promise<ApiResponse<CompanyListItem[]>> {
  try {
    const result = await getMockCompanies(params);
    return {
      data: result.data,
      success: true
    };
  } catch (error) {
    throw {
      message: error instanceof Error ? error.message : 'Failed to fetch companies',
      code: 'FETCH_ERROR',
      details: error
    };
  }
}

export async function getCompanyById(id: string): Promise<ApiResponse<CompanyDetailed>> {
  try {
    const company = mockCompanyDetails[id];
    if (!company) {
      throw new Error('Company not found');
    }
    
    return {
      data: company,
      success: true
    };
  } catch (error) {
    throw {
      message: error instanceof Error ? error.message : 'Failed to fetch company',
      code: 'FETCH_ERROR',
      details: error
    };
  }
}

export async function getSectionDetails(companyId: string, sectionId: string): Promise<ApiResponse<SectionDetailed>> {
  try {
    const section = await getMockSectionDetails(companyId, sectionId);
    if (!section) {
      throw new Error('Section not found');
    }
    
    return {
      data: section,
      success: true
    };
  } catch (error) {
    throw {
      message: error instanceof Error ? error.message : 'Failed to fetch section',
      code: 'FETCH_ERROR',
      details: error
    };
  }
}

export async function createCompany(companyData: any): Promise<ApiResponse<CompanyDetailed>> {
  try {
    // Mock implementation - in real app, this would call the API
    const newCompany: CompanyDetailed = {
      id: Math.random().toString(),
      name: companyData.name,
      overall_score: 0,
      created_at: new Date().toISOString(),
      sections: []
    };
    
    return {
      data: newCompany,
      success: true
    };
  } catch (error) {
    throw {
      message: error instanceof Error ? error.message : 'Failed to create company',
      code: 'CREATE_ERROR',
      details: error
    };
  }
}

// Re-export types and contracts
export * from './apiContract';
export { getMockCompanies } from './mockApi';
