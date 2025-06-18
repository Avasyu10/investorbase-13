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
    } : null
  };
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
        
        // Convert UI sort field to database column name
        let dbSortField = sortBy;
        if (sortBy === 'name' || sortBy === 'overall_score') {
          dbSortField = sortBy === 'overall_score' ? 'overall_score' : 'name';
        }
        
        console.log('Fetching companies for user:', user.id);
        
        let query = supabase
          .from('companies')
          .select(`
            id, name, overall_score, created_at, updated_at, 
            assessment_points, report_id, user_id, source,
            poc_name, phonenumber, email, industry,
            report:report_id (
              pdf_url, 
              is_public_submission
            ),
            company_details!left (status, status_date, notes, contact_email, point_of_contact, industry, teammember_name)
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
        
        // For companies that have report_id, fetch additional industry data from public_form_submissions
        const companiesWithIndustry = await Promise.all((data || []).map(async (company) => {
          let publicFormIndustry = null;
          
          // If company has a report_id, try to get industry from public_form_submissions
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
            // Use industry from public_form_submissions if available, otherwise fallback to existing industry
            industry: publicFormIndustry || company.industry
          });
        }));
        
        return {
          companies: companiesWithIndustry,
          totalCount: count || 0
        };
      } catch (err) {
        console.error("Error in useCompanies:", err);
        throw err;
      }
    },
    enabled: !!user,
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

export { useCompanyDetails } from './companyHooks/useCompanyDetails';
export { useSectionDetails } from './companyHooks/useSectionDetails';
