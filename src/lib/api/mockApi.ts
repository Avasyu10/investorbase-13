
import { CompanyListItem, CompanyDetailed, SectionDetailed } from "./apiContract";
import { dummyCompanies, dummySections } from "../dummyData";

const getCompanies = async (options?: {
  page?: number;
  limit?: number;
  sortBy?: keyof CompanyListItem;
  sortOrder?: 'asc' | 'desc';
}) => {
  // Apply pagination if specified
  let data = [...dummyCompanies];
  
  // Apply sorting if specified
  if (options?.sortBy) {
    const { sortBy, sortOrder = 'asc' } = options;
    data.sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortOrder === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  // Apply pagination
  if (options?.page && options?.limit) {
    const startIndex = (options.page - 1) * options.limit;
    data = data.slice(startIndex, startIndex + options.limit);
  }
  
  return { 
    data: { 
      data, 
      pagination: { 
        total: dummyCompanies.length 
      } 
    } 
  };
};

const getCompany = async (id: string) => {
  try {
    // Try to find the company by its ID
    // If id is a string but is numeric, convert to number for the comparison
    const numberId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
    
    // Find the company in the dummy data
    const company = dummyCompanies.find(company => {
      if (typeof numberId === 'number') {
        return company.id === numberId;
      }
      return false;
    });
    
    if (!company) {
      throw new Error("Company not found");
    }
    
    // Find the sections for this company
    const sections = dummySections.filter(section => {
      if (typeof numberId === 'number') {
        return section.companyId === numberId;
      }
      return false;
    });
    
    // Create the detailed company object with its sections
    const companyDetailed: CompanyDetailed = {
      ...company,
      sections: sections.map(section => ({
        id: section.id,
        type: section.type,
        title: section.title,
        score: section.score,
        description: section.description,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt
      }))
    };
    
    return { data: companyDetailed };
  } catch (error) {
    console.error(`Error getting company ${id}:`, error);
    throw error;
  }
};

const getSection = async (companyId: string, sectionId: string) => {
  try {
    // Convert IDs if necessary
    const numericCompanyId = /^\d+$/.test(companyId) ? parseInt(companyId, 10) : companyId;
    
    // Find the section by company ID and section ID
    const section = dummySections.find(section => {
      if (typeof numericCompanyId === 'number') {
        return section.companyId === numericCompanyId && section.id === sectionId;
      }
      return false;
    });
    
    if (!section) {
      throw new Error("Section not found");
    }
    
    // Create the detailed section object
    const sectionDetailed: SectionDetailed = {
      id: section.id,
      type: section.type,
      title: section.title,
      score: section.score,
      description: section.description,
      strengths: section.strengths || [],
      weaknesses: section.weaknesses || [],
      detailedContent: section.detailedContent || "",
      createdAt: section.createdAt,
      updatedAt: section.updatedAt
    };
    
    return { data: sectionDetailed };
  } catch (error) {
    console.error(`Error getting section ${sectionId} for company ${companyId}:`, error);
    throw error;
  }
};

const mockApi = {
  getCompanies,
  getCompany,
  getSection,
};

export default mockApi;
