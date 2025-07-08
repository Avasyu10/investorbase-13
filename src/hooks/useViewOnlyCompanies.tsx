
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Map Supabase DB types to API contract types for view-only
function mapDbCompanyToApi(company: any) {
  const overallScore = typeof company.overall_score === 'number' 
    ? parseFloat(company.overall_score.toFixed(1))
    : 0;
  
  let source = company.source || 'dashboard';
  
  // Map source values for display
  let displaySource = source;
  if (source === 'eureka_form') {
    displaySource = 'IIT Bombay';
  } else if (source === 'deck_upload') {
    displaySource = 'BITS';
  } else if (source === 'dashboard') {
    displaySource = 'Founder';
  }
  
  return {
    id: company.id,
    name: company.name,
    overall_score: overallScore,
    created_at: company.created_at,
    updated_at: company.updated_at || company.created_at,
    assessment_points: company.assessment_points || [],
    report_id: company.report_id,
    source: displaySource, // Use the mapped display source
    scoring_reason: company.scoring_reason,
    poc_name: company.poc_name,
    phonenumber: company.phonenumber,
    email: company.email,
    industry: company.industry,
    response_received: company.response_received,
    // Remove deck_url completely - we'll use report_id to access reports table directly
  };
}

export function useViewOnlyCompanies(
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
    queryKey: ['view-only-companies', page, pageSize, sortBy, sortOrder, search, user?.id],
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
        if (sortBy === 'name' || sortBy === 'overall_score') {
          dbSortField = sortBy === 'overall_score' ? 'overall_score' : 'name';
        }
        
        console.log('Fetching filtered companies for view-only user:', user.id);
        
        // Query companies with specific source filters - no need to join with reports table for deck URLs
        let query = supabase
          .from('companies')
          .select(`
            id, name, overall_score, created_at, updated_at, 
            assessment_points, report_id, response_received, user_id, source,
            poc_name, phonenumber, email, industry, scoring_reason
          `, { count: 'exact' })
          .in('source', ['eureka_form', 'deck_upload', 'dashboard']); // Filter by specific sources

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
        
        console.log(`Retrieved ${data?.length || 0} companies out of ${count || 0} total (filtered by source)`);
        
        // For companies that have report_id, fetch additional industry data from public_form_submissions
        const companiesWithIndustry = await Promise.all((data || []).map(async (company) => {
          let publicFormIndustry = null;
          
          if (company.report_id) {
            try {
              const { data: publicFormData } = await supabase
                .from('public_form_submissions')
                .select('industry')
                .eq('report_id', company.report_id)
                .maybeSingle();
              
              if (publicFormData) {
                publicFormIndustry = publicFormData.industry;
              }
            } catch (err) {
              console.log('Could not fetch public form industry for company:', company.id);
            }
          }
          
          return mapDbCompanyToApi({
            ...company,
            industry: publicFormIndustry || company.industry,
            response_received: company.response_received
          });
        }));
        
        return {
          companies: companiesWithIndustry,
          totalCount: count || 0
        };
      } catch (err) {
        console.error("Error in useViewOnlyCompanies:", err);
        throw err;
      }
    },
    enabled: !!user,
    meta: {
      onError: (err: any) => {
        console.error("useViewOnlyCompanies query error:", err);
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
