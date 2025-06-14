import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import useCompanyDetails from './companyHooks/useCompanyDetails';
import { useAuth } from '@/hooks/useAuth';

// Map Supabase DB types to API contract types
function mapDbCompanyToApi(company: any) {
  // Ensure the overall score is properly normalized and formatted
  const overallScore = typeof company.overall_score === 'number' 
    ? parseFloat(company.overall_score.toFixed(1))
    : 0;
  
  // Determine source based on pdf_url location
  let source = company.source || 'dashboard';
  
  // If we have report data with pdf_url, use it to determine the source
  if (company.report && company.report.pdf_url) {
    if (company.report.pdf_url.startsWith('email_attachments/')) {
      source = 'email';
    } else if (company.source === 'public_url' || company.report.is_public_submission) {
      source = 'public_url';
    }
  }
  
  return {
    id: company.id,
    name: company.name,
    overallScore: overallScore,
    createdAt: company.created_at,
    updatedAt: company.updated_at || company.created_at,
    score: overallScore, // For backward compatibility
    assessmentPoints: company.assessment_points || [],
    reportId: company.report_id,
    perplexityResponse: company.perplexity_response,
    perplexityPrompt: company.perplexity_prompt,
    perplexityRequestedAt: company.perplexity_requested_at,
    source: source // Set source based on our determination
  };
}

export function useCompanies(
  page: number = 1, 
  pageSize: number = 20, 
  sortBy: string = 'created_at', 
  sortOrder: 'asc' | 'desc' = 'desc',
  search: string = '' // Add search parameter
) {
  const { user } = useAuth();

  const {
    data: companiesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['companies', page, pageSize, sortBy, sortOrder, search, user?.id], // Add user.id to queryKey
    queryFn: async () => {
      try {
        if (!user) {
          console.log('No user found, returning empty results');
          return { companies: [], totalCount: 0 };
        }

        // Calculate offset based on page number and page size
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        // Convert UI sort field to database column name
        let dbSortField = sortBy;
        if (sortBy === 'name' || sortBy === 'overallScore') {
          dbSortField = sortBy === 'overallScore' ? 'overall_score' : 'name';
        }
        
        console.log('Fetching companies for user:', user.id);
        
        // Since RLS was removed, we'll fetch all companies that belong to this user
        // or are from reports they have access to
        let query = supabase
          .from('companies')
          .select(`
            id, name, overall_score, created_at, updated_at, 
            assessment_points, report_id, perplexity_requested_at, 
            perplexity_response, perplexity_prompt, user_id, source,
            report:report_id (pdf_url, is_public_submission)
          `, { count: 'exact' })
          .or(`user_id.eq.${user.id},report_id.in.(${await getUserAccessibleReports(user.id)})`);

        // Add search filter if provided
        if (search && search.trim() !== '') {
          query = query.ilike('name', `%${search.trim()}%`);
        }

        // Add sorting and pagination
        const { data, error, count } = await query
          .order(dbSortField, { ascending: sortOrder === 'asc' })
          .range(from, to);

        if (error) {
          console.error("Error fetching companies:", error);
          throw error;
        }
        
        console.log(`Retrieved ${data?.length || 0} companies out of ${count || 0} total`);
        
        // Log the companies by source for debugging
        if (data && data.length > 0) {
          console.log('Sample company data:', data[0]);
          const sourceBreakdown = data.reduce((acc, company) => {
            acc[company.source || 'unknown'] = (acc[company.source || 'unknown'] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log('Companies by source:', sourceBreakdown);
        }

        return {
          companies: (data || []).map(mapDbCompanyToApi),
          totalCount: count || 0
        };
      } catch (err) {
        console.error("Error in useCompanies:", err);
        throw err;
      }
    },
    enabled: !!user, // Only run query when user is available
    meta: {
      onError: (err: any) => {
        console.error("useCompanies query error:", err);
        toast({
          title: 'Error loading companies',
          description: err.message || 'Failed to load companies data',
          variant: 'destructive',
        });
      },
    },
  });

  return {
    companies: companiesData?.companies || [],
    totalCount: companiesData?.totalCount || 0,
    isLoading,
    error,
    refetch,
  };
}

// Helper function to get report IDs the user has access to
async function getUserAccessibleReports(userId: string): Promise<string> {
  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('id')
      .or(`user_id.eq.${userId},is_public_submission.eq.true`);

    if (error) {
      console.error('Error fetching accessible reports:', error);
      return '';
    }

    return reports?.map(r => r.id).join(',') || '';
  } catch (err) {
    console.error('Error in getUserAccessibleReports:', err);
    return '';
  }
}

export { default as useCompanyDetails } from './companyHooks/useCompanyDetails';
export { useSectionDetails } from './companyHooks/useSectionDetails';
