
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCompanyDetails } from './companyHooks/useCompanyDetails';
import { useAuth } from '@/hooks/useAuth';

// Map Supabase DB types to API contract types with safe defaults
function mapDbCompanyToApi(company: any) {
  if (!company || typeof company !== 'object') {
    console.warn('Invalid company data received:', company);
    return null;
  }

  try {
    // Ensure the overall score is properly normalized and formatted
    const overallScore = typeof company.overall_score === 'number' 
      ? parseFloat(company.overall_score.toFixed(1))
      : 0;
    
    // Determine source based on pdf_url location with safe fallbacks
    let source = company.source || 'dashboard';
    
    // If we have report data with pdf_url, use it to determine the source
    if (company.report && typeof company.report === 'object' && company.report.pdf_url) {
      if (typeof company.report.pdf_url === 'string' && company.report.pdf_url.startsWith('email_attachments/')) {
        source = 'email';
      } else if (company.source === 'public_url' || company.report.is_public_submission) {
        source = 'public_url';
      }
    }
    
    return {
      id: company.id || '',
      name: company.name || 'Unnamed Company',
      overall_score: overallScore,
      created_at: company.created_at || new Date().toISOString(),
      updated_at: company.updated_at || company.created_at || new Date().toISOString(),
      assessment_points: Array.isArray(company.assessment_points) ? company.assessment_points : [],
      report_id: company.report_id || null,
      source: source
    };
  } catch (error) {
    console.error('Error mapping company data:', error, company);
    return null;
  }
}

export function useCompanies(
  page: number = 1, 
  pageSize: number = 20, 
  sortBy: string = 'created_at', 
  sortOrder: 'asc' | 'desc' = 'desc',
  search: string = ''
) {
  const { user } = useAuth();

  const {
    data: companiesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['companies', page, pageSize, sortBy, sortOrder, search, user?.id],
    queryFn: async () => {
      try {
        if (!user) {
          console.log('No user found, returning empty results');
          return { companies: [], totalCount: 0 };
        }

        // Calculate offset based on page number and page size
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        // Convert UI sort field to database column name with validation
        let dbSortField = 'created_at'; // Safe default
        if (['name', 'overall_score', 'created_at', 'updated_at'].includes(sortBy)) {
          dbSortField = sortBy;
        }
        
        console.log('Fetching companies for user:', user.id);
        
        // Build the query with comprehensive error handling
        let query = supabase
          .from('companies')
          .select(`
            id, name, overall_score, created_at, updated_at, 
            assessment_points, report_id, user_id, source,
            report:report_id (pdf_url, is_public_submission)
          `, { count: 'exact' });

        // Add user filter with safe fallback
        try {
          const accessibleReports = await getUserAccessibleReports(user.id);
          if (accessibleReports && accessibleReports.length > 0) {
            query = query.or(`user_id.eq.${user.id},report_id.in.(${accessibleReports})`);
          } else {
            query = query.eq('user_id', user.id);
          }
        } catch (reportError) {
          console.error('Error getting accessible reports:', reportError);
          // Fallback to only user's own companies
          query = query.eq('user_id', user.id);
        }

        // Add search filter if provided
        if (search && typeof search === 'string' && search.trim() !== '') {
          query = query.ilike('name', `%${search.trim()}%`);
        }

        // Add sorting and pagination with safe parameters
        const { data, error, count } = await query
          .order(dbSortField, { ascending: sortOrder === 'asc' })
          .range(from, to);

        if (error) {
          console.error("Error fetching companies:", error);
          throw error;
        }
        
        console.log(`Retrieved ${data?.length || 0} companies out of ${count || 0} total`);
        
        // Filter out any null values from mapping
        const mappedCompanies = (data || [])
          .map(mapDbCompanyToApi)
          .filter(company => company !== null);
        
        return {
          companies: mappedCompanies,
          totalCount: count || 0
        };
      } catch (err) {
        console.error("Error in useCompanies:", err);
        // Return empty results instead of throwing to prevent crashes
        return { companies: [], totalCount: 0 };
      }
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000, // 30 seconds
    meta: {
      onError: (err: any) => {
        console.error("useCompanies query error:", err);
        if (typeof window !== 'undefined') {
          toast({
            title: 'Error loading companies',
            description: err?.message || 'Failed to load companies data',
            variant: 'destructive',
          });
        }
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

// Helper function to get report IDs the user has access to with comprehensive error handling
async function getUserAccessibleReports(userId: string): Promise<string> {
  if (!userId || typeof userId !== 'string') {
    console.warn('Invalid userId provided to getUserAccessibleReports');
    return '';
  }

  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('id')
      .or(`user_id.eq.${userId},is_public_submission.eq.true`);

    if (error) {
      console.error('Error fetching accessible reports:', error);
      return '';
    }

    if (!reports || !Array.isArray(reports)) {
      console.warn('Invalid reports data received');
      return '';
    }

    return reports.map(r => r?.id).filter(id => id).join(',') || '';
  } catch (err) {
    console.error('Error in getUserAccessibleReports:', err);
    return '';
  }
}

export { useCompanyDetails } from './companyHooks/useCompanyDetails';
export { useSectionDetails } from './companyHooks/useSectionDetails';
