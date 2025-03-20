
import { apiClient } from "./apiClient";
import { 
  CompanyListItem, 
  CompanyDetailed, 
  SectionDetailed 
} from "./apiContract";
import mockApi from "./mockApi";

const getCompanies = async (options?: {
  page?: number;
  limit?: number;
  sortBy?: keyof CompanyListItem;
  sortOrder?: 'asc' | 'desc';
}) => {
  try {
    return await apiClient.get<CompanyListItem[] | { data: CompanyListItem[], pagination: { total: number } }>("/companies", { params: options });
  } catch (error) {
    console.log("Failed to get companies, using mock data", error);
    return await mockApi.getCompanies(options);
  }
};

const getCompany = async (id: string | number) => {
  try {
    // Convert the ID to a string for consistency
    const stringId = id.toString();
    return await apiClient.get<CompanyDetailed>(`/companies/${stringId}`);
  } catch (error) {
    console.log(`Failed to get company ${id}, using mock data`, error);
    // For mock data, we need to convert string IDs to numbers
    let numberId: number;
    if (typeof id === 'string') {
      // Handle potentially large IDs
      try {
        // Try to convert to number safely
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
          throw new Error("Invalid ID format");
        }
        numberId = parsedId;
      } catch (parseError) {
        console.error("Error parsing ID:", parseError);
        throw new Error(`Invalid company ID format: ${id}`);
      }
    } else {
      numberId = id;
    }
    return await mockApi.getCompany(numberId.toString());
  }
};

const getSection = async (companyId: string | number, sectionId: string) => {
  try {
    const stringCompanyId = companyId.toString();
    return await apiClient.get<SectionDetailed>(`/companies/${stringCompanyId}/sections/${sectionId}`);
  } catch (error) {
    console.log(`Failed to get section ${sectionId} for company ${companyId}, using mock data`, error);
    
    // For mock data, ensure we have a number for companyId
    let numberId: number;
    if (typeof companyId === 'string') {
      // Try to convert to number safely
      try {
        const parsedId = parseInt(companyId, 10);
        if (isNaN(parsedId)) {
          throw new Error("Invalid ID format");
        }
        numberId = parsedId;
      } catch (parseError) {
        console.error("Error parsing ID:", parseError);
        throw new Error(`Invalid company ID format: ${companyId}`);
      }
    } else {
      numberId = companyId;
    }
    
    return await mockApi.getSection(numberId.toString(), sectionId);
  }
};

const api = {
  getCompanies,
  getCompany,
  getSection,
};

export default api;
