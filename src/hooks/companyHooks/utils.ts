
import { CompanyListItem, CompanyDetailed, SectionBase, SectionDetailed, SectionType } from "@/lib/api/apiContract";

/**
 * Converts a UUID to a numeric ID for display purposes
 * Takes the first 8 characters of the UUID and converts to a number
 */
export function uuidToNumericId(uuid: string): number {
  return parseInt(uuid.replace(/-/g, '').substring(0, 8), 16);
}

/**
 * Maps a database company record to the API contract format
 */
export function mapDbCompanyToListItem(item: any): CompanyListItem {
  const numericId = uuidToNumericId(item.id);
  
  return {
    id: numericId,
    name: item.name,
    overallScore: item.overall_score,
    createdAt: item.created_at,
    updatedAt: item.updated_at || item.created_at,
    assessmentPoints: item.assessment_points || [],
    source: 'dashboard',
    reportId: item.report_id
  };
}

/**
 * Maps a database company with sections to the detailed API contract format
 */
export function mapDbCompanyToDetailed(companyData: any, sectionsData: any[]): CompanyDetailed {
  const numericId = uuidToNumericId(companyData.id);
  
  return {
    id: numericId,
    name: companyData.name,
    overallScore: companyData.overall_score,
    createdAt: companyData.created_at,
    updatedAt: companyData.updated_at || companyData.created_at,
    sections: sectionsData?.map(mapDbSectionToApi) || [],
    assessmentPoints: companyData.assessment_points || [],
    perplexityResponse: companyData.perplexity_response,
    perplexityPrompt: companyData.perplexity_prompt,
    perplexityRequestedAt: companyData.perplexity_requested_at,
    reportId: companyData.report_id
  };
}

/**
 * Maps a database section to the API contract format
 */
export function mapDbSectionToApi(section: any): SectionBase {
  return {
    id: section.id,
    type: section.type as SectionType,
    title: section.title,
    score: section.score,
    description: section.description || '',
    createdAt: section.created_at,
    updatedAt: section.updated_at || section.created_at
  };
}

/**
 * Maps a database section with additional details to the detailed API contract format
 */
export function mapDbSectionToDetailed(
  section: any, 
  strengths: string[], 
  weaknesses: string[]
): SectionDetailed {
  return {
    ...mapDbSectionToApi(section),
    strengths,
    weaknesses,
    detailedContent: section.description || ''
  };
}
