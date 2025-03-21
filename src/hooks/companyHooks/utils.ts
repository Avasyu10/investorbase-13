
/**
 * Converts a UUID to a numeric ID by removing hyphens
 * and taking the first part (usually 8 characters)
 */
export function uuidToNumericId(uuid: string): string {
  return uuid.replace(/-/g, '').substring(0, 8);
}

/**
 * Converts a company data object from Supabase format to the application format
 */
export function formatCompanyData(rawData: any) {
  return {
    id: rawData.id,
    name: rawData.name || 'Unknown Company',
    overallScore: rawData.overall_score || 0,
    reportId: rawData.report_id,
    perplexityResponse: rawData.perplexity_response,
    perplexityRequestedAt: rawData.perplexity_requested_at,
    assessmentPoints: rawData.assessment_points || [],
    numericId: uuidToNumericId(rawData.id),
  };
}
