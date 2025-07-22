
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCompanyDetails } from './companyHooks/useCompanyDetails';
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
    overall_score: overallScore,
    created_at: company.created_at,
    updated_at: company.updated_at || company.created_at,
    assessment_points: company.assessment_points || [],
    report_id: company.report_id,
    source: source,
    scoring_reason: company.scoring_reason,
    // FIXED: Keep contact information from companies table and don't set to null
    poc_name: company.poc_name,
    phonenumber: company.phonenumber,
    email: company.email,
    industry: company.industry,
    // Include company_details fields for CRM functionality
    company_details: company.company_details && company.company_details.length > 0 ? {
      status: company.company_details[0].status,
      status_date: company.company_details[0].status_date,
      notes: company.company_details[0].notes,
      contact_email: company.company_details[0].contact_email,
      point_of_contact: company.company_details[0].point_of_contact,
      industry: company.company_details[0].industry,
      teammember_name: company.company_details[0].teammember_name
    } : null,
    response_received: company.response_received
  };
}

// Cached helper function to get report IDs the user has access to
const reportCache = new Map();
async function getUserAccessibleReports(userId: string): Promise<string> {
  // Check cache first
  const cacheKey = `reports_${userId}`;
  const cached = reportCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
    return cached.data;
  }

  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('id')
      .or(`user_id.eq.${userId},is_public_submission.eq.true`)
      .limit(1000); // Add reasonable limit to prevent massive queries

    if (error) {
      console.error('Error fetching accessible reports:', error);
      return '';
    }

    const result = reports?.map(r => r.id).join(',') || '';
    
    // Cache the result
    reportCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (err) {
    console.error('Error in getUserAccessibleReports:', err);
    return '';
  }
}

// Separate query for potential stats to avoid blocking main query
async function getPotentialStats(userId: string, accessibleReports: string) {
  try {
    const { data: statsData, error: statsError } = await supabase
      .from('companies')
      .select('overall_score')
      .or(`user_id.eq.${userId}${accessibleReports ? `,report_id.in.(${accessibleReports})` : ''}`)
      .not('overall_score', 'is', null);

    if (statsError) {
      console.error("Error fetching potential stats:", statsError);
      return { highPotential: 0, mediumPotential: 0, badPotential: 0 };
    }

    // Calculate potential stats from all companies
    return {
      highPotential: statsData?.filter(c => c.overall_score > 70).length || 0,
      mediumPotential: statsData?.filter(c => c.overall_score >= 50 && c.overall_score <= 70).length || 0,
      badPotential: statsData?.filter(c => c.overall_score < 50).length || 0,
    };
  } catch (err) {
    console.error("Error in getPotentialStats:", err);
    return { highPotential: 0, mediumPotential: 0, badPotential: 0 };
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
          return { companies: [], totalCount: 0, potentialStats: { highPotential: 0, mediumPotential: 0, badPotential: 0 } };
        }

        console.log('Fetching companies for user:', user.id, 'Page:', page, 'PageSize:', pageSize);
        
        // Calculate offset based on page number and page size
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        // Convert UI sort field to database column name
        let dbSortField = sortBy;
        if (sortBy === 'name' || sortBy === 'overall_score') {
          dbSortField = sortBy === 'overall_score' ? 'overall_score' : 'name';
        }
        
        // Get accessible reports once and reuse - optimization with caching
        const accessibleReports = await getUserAccessibleReports(user.id);
        
        // Build the main query with optimized select
        let query = supabase
          .from('companies')
          .select(`
            id, name, overall_score, created_at, updated_at, 
            assessment_points, report_id, response_received, user_id, source,
            poc_name, phonenumber, email, industry, scoring_reason,
            report:report_id (
              pdf_url, 
              is_public_submission
            ),
            company_details!left (status, status_date, notes, contact_email, point_of_contact, industry, teammember_name)
          `, { count: 'exact' })
          .or(`user_id.eq.${user.id}${accessibleReports ? `,report_id.in.(${accessibleReports})` : ''}`);

        // Add search filter if provided
        if (search && search.trim() !== '') {
          query = query.ilike('name', `%${search.trim()}%`);
        }

        // Execute main query with timeout and retry logic
        const startTime = Date.now();
        console.log('Starting companies query...');
        
        const result = await Promise.race([
          query
            .order(dbSortField, { ascending: sortOrder === 'asc' })
            .range(from, to),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout after 30 seconds')), 30000)
          )
        ]) as { data: any[] | null; error: any; count: number | null };

        const { data, error, count } = result;
        const queryTime = Date.now() - startTime;
        console.log(`Companies query completed in ${queryTime}ms`);

        if (error) {
          console.error("Error fetching companies:", error);
          throw error;
        }
        
        console.log(`Retrieved ${data?.length || 0} companies out of ${count || 0} total for page ${page}`);

        // Fetch potential stats in background (don't block main query)
        const potentialStatsPromise = getPotentialStats(user.id, accessibleReports);
        
        // Process companies data - simplified without additional queries for better performance
        const processedCompanies = (data || []).map(company => {
          return mapDbCompanyToApi({
            ...company,
            industry: company.industry, // Use existing industry data
            response_received: company.response_received
          });
        });
        
        // Wait for potential stats (with fallback)
        let potentialStats;
        try {
          potentialStats = await Promise.race([
            potentialStatsPromise,
            new Promise((resolve) => 
              setTimeout(() => resolve({ highPotential: 0, mediumPotential: 0, badPotential: 0 }), 5000)
            )
          ]);
        } catch (statsError) {
          console.error('Error fetching potential stats:', statsError);
          potentialStats = { highPotential: 0, mediumPotential: 0, badPotential: 0 };
        }
        
        return {
          companies: processedCompanies,
          totalCount: count || 0,
          potentialStats
        };
      } catch (err) {
        console.error("Error in useCompanies:", err);
        throw err;
      }
    },
    enabled: !!user,
    staleTime: 0, // Force refresh to ensure data loads immediately  
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
    retry: 3, // Retry failed queries up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: true, // Ensure refetch when window regains focus
    refetchOnReconnect: true, // Refetch when connection is restored
    meta: {
      onError: (err: any) => {
        console.error("useCompanies query error:", err);
        toast({
          title: 'Error loading companies',
          description: err.message || 'Failed to load companies data. Please try refreshing the page.',
          variant: 'destructive',
        });
      },
    },
  });

  return {
    companies: companiesData?.companies || [],
    totalCount: companiesData?.totalCount || 0,
    potentialStats: companiesData?.potentialStats || { highPotential: 0, mediumPotential: 0, badPotential: 0 },
    isLoading,
    error,
    refetch,
  };
}

export { useCompanyDetails } from './companyHooks/useCompanyDetails';
export { useSectionDetails } from './companyHooks/useSectionDetails';
