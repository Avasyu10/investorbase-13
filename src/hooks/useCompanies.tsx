
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Map Supabase DB types to API contract types
function mapDbCompanyToApi(company: any) {
  // Ensure the overall score is properly normalized and formatted
  const overallScore = typeof company.overall_score === 'number' 
    ? parseFloat(company.overall_score.toFixed(1))
    : 0;
  
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
    perplexityRequestedAt: company.perplexity_requested_at
  };
}

function mapDbSectionToApi(section: any) {
  return {
    id: section.id,
    type: section.type,
    title: section.title,
    score: section.score,
    description: section.description || '',
    createdAt: section.created_at,
    updatedAt: section.updated_at || section.created_at,
  };
}

function mapDbSectionDetailedToApi(section: any, strengths: string[], weaknesses: string[]) {
  return {
    ...mapDbSectionToApi(section),
    strengths,
    weaknesses,
    detailedContent: section.description || '',
  };
}

export function useCompanies(page: number = 1, pageSize: number = 20, sortBy: string = 'created_at', sortOrder: 'asc' | 'desc' = 'desc') {
  const {
    data: companiesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['companies', page, pageSize, sortBy, sortOrder],
    queryFn: async () => {
      try {
        // Calculate offset based on page number and page size
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        // Convert UI sort field to database column name
        let dbSortField = sortBy;
        if (sortBy === 'name' || sortBy === 'overallScore') {
          dbSortField = sortBy === 'overallScore' ? 'overall_score' : 'name';
        }
        
        // Get the authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: 'Authentication required',
            description: 'Please sign in to view companies',
            variant: 'destructive',
          });
          return { companies: [], totalCount: 0 };
        }
        
        console.log('Fetching companies for user:', user.id);
        
        // Query with RLS - this will only return companies the user has access to
        const { data, error, count } = await supabase
          .from('companies')
          .select('id, name, overall_score, created_at, updated_at, assessment_points, report_id, perplexity_requested_at, perplexity_response, perplexity_prompt, user_id', { count: 'exact' })
          .eq('user_id', user.id) // Explicitly filter by user_id to ensure only user's data is returned
          .order(dbSortField, { ascending: sortOrder === 'asc' })
          .range(from, to);

        if (error) {
          console.error("Error fetching companies:", error);
          throw error;
        }
        
        console.log(`Retrieved ${data.length} companies out of ${count} total`);
        
        // Log the first few companies to help with debugging
        if (data.length > 0) {
          console.log('Sample company data:', data[0]);
        }

        return {
          companies: data.map(mapDbCompanyToApi),
          totalCount: count || 0
        };
      } catch (err) {
        console.error("Error in useCompanies:", err);
        throw err;
      }
    },
    meta: {
      onError: (err: any) => {
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
  };
}

export function useCompanyDetails(companyId: string | undefined) {
  const {
    data: company,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      try {
        // Get the authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: 'Authentication required',
            description: 'Please sign in to view company details',
            variant: 'destructive',
          });
          return null;
        }
        
        // First check: Try to find by direct UUID lookup if companyId is a UUID
        if (companyId.includes('-')) {
          console.log('Attempting direct UUID lookup for:', companyId);
          
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (companyData) {
            console.log('Found company by direct UUID lookup:', companyData);
            
            // Now get the sections
            const { data: sectionsData, error: sectionsError } = await supabase
              .from('sections')
              .select('*')
              .eq('company_id', companyId)
              .order('created_at', { ascending: true });
              
            if (sectionsError) throw sectionsError;
            
            return {
              ...mapDbCompanyToApi(companyData),
              sections: sectionsData?.map(mapDbSectionToApi) || [],
            };
          }
          
          if (companyError && !companyError.message.includes('not found')) {
            throw companyError;
          }
        }
        
        // Second check: Try to find UUID by numeric ID
        console.log('Attempting to find company by numeric ID:', companyId);
        
        // Call the RPC function with the proper parameter format
        const { data: uuidData, error: uuidError } = await supabase
          .rpc('find_company_by_numeric_id_bigint', {
            numeric_id: companyId.replace(/-/g, '')
          });
        
        if (uuidError) {
          console.error('Error finding company UUID by numeric ID:', uuidError);
          throw uuidError;
        }
        
        if (uuidData && uuidData.length > 0) {
          const companyUuid = uuidData[0];
          console.log('Found company UUID:', companyUuid);
          
          // Try to get company with this UUID - but without user_id filter first
          // This is important for publicly submitted companies
          const { data: publicCompanyData, error: publicCompanyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyUuid)
            .maybeSingle();
          
          if (publicCompanyData) {
            // Check if this company belongs to user or is a public submission
            const isCompanyOwner = publicCompanyData.user_id === user.id;
            
            // Also check if this company is from a public submission (check reports table)
            const { data: reportData, error: reportError } = await supabase
              .from('reports')
              .select('is_public_submission')
              .eq('id', publicCompanyData.report_id)
              .maybeSingle();
              
            const isPublicSubmission = reportData && reportData.is_public_submission;
            
            // Only allow access if user owns the company or it's a public submission
            if (isCompanyOwner || isPublicSubmission) {
              console.log('Access granted to company. Owner:', isCompanyOwner, 'Public:', isPublicSubmission);
              
              // Now get the sections
              const { data: sectionsData, error: sectionsError } = await supabase
                .from('sections')
                .select('*')
                .eq('company_id', companyUuid)
                .order('created_at', { ascending: true });
                
              if (sectionsError) throw sectionsError;
              
              return {
                ...mapDbCompanyToApi(publicCompanyData),
                sections: sectionsData?.map(mapDbSectionToApi) || [],
              };
            } else {
              console.log('Access denied: Not owner and not public submission');
              return null;
            }
          }
          
          if (publicCompanyError && !publicCompanyError.message.includes('not found')) {
            throw publicCompanyError;
          }
        }
        
        // Third check: Check direct via the report_id for public submissions
        if (!isNaN(Number(companyId))) {
          console.log('Checking if numeric ID might be a report ID');
          
          // Try to locate a public submission by report_id
          const { data: reportData, error: reportError } = await supabase
            .from('reports')
            .select('*, companies(*)')
            .eq('id', companyId)
            .eq('is_public_submission', true)
            .maybeSingle();
          
          if (reportData?.companies) {
            console.log('Found company via public report:', reportData.companies);
            
            // Now get the sections
            const { data: sectionsData, error: sectionsError } = await supabase
              .from('sections')
              .select('*')
              .eq('company_id', reportData.companies.id)
              .order('created_at', { ascending: true });
              
            if (sectionsError) throw sectionsError;
            
            return {
              ...mapDbCompanyToApi(reportData.companies),
              sections: sectionsData?.map(mapDbSectionToApi) || [],
            };
          }
        }
        
        console.log('No company found with the given ID:', companyId);
        return null;
      } catch (err) {
        console.error("Error in useCompanyDetails:", err);
        throw err;
      }
    },
    enabled: !!companyId,
    meta: {
      onError: (err: any) => {
        toast({
          title: 'Error loading company',
          description: err.message || 'Failed to load company details',
          variant: 'destructive',
        });
      },
    },
  });

  return {
    company,
    isLoading,
    error,
  };
}

export function useSectionDetails(companyId: string | undefined, sectionId: string | undefined) {
  const {
    data: section,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['section', companyId, sectionId],
    queryFn: async () => {
      if (!companyId || !sectionId) return null;
      
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to view section details',
          variant: 'destructive',
        });
        return null;
      }
      
      // First verify the user has access to this company - check both owned and public submissions
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, report_id')
        .eq('id', companyId)
        .maybeSingle();
        
      if (companyError && !companyError.message.includes('not found')) {
        console.error("Error checking company access:", companyError);
        throw companyError;
      }
      
      if (!companyData) {
        console.log('Company not found, checking if it might be a public submission');
        
        // Try to find through report (for public submissions)
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('*, companies(id)')
          .eq('companies.id', companyId)
          .eq('is_public_submission', true)
          .maybeSingle();
          
        if (reportError && !reportError.message.includes('not found')) {
          throw reportError;
        }
        
        if (!reportData?.companies?.id) {
          console.error('Access denied to company');
          toast({
            title: 'Access denied',
            description: 'You do not have permission to view this section',
            variant: 'destructive',
          });
          return null;
        }
      } else if (companyData) {
        // If company exists, check if user owns it or if it's a public submission
        const isCompanyOwner = await checkUserOwnsCompany(companyId, user.id);
        const isPublicSubmission = await checkPublicSubmission(companyData.report_id);
        
        if (!isCompanyOwner && !isPublicSubmission) {
          console.error('Access denied: Not owner and not public submission');
          toast({
            title: 'Access denied',
            description: 'You do not have permission to view this section',
            variant: 'destructive',
          });
          return null;
        }
      }
      
      // Get the section data with full description
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('*, section_details(*)')
        .eq('id', sectionId)
        .eq('company_id', companyId)
        .maybeSingle();
        
      if (sectionError) throw sectionError;
      if (!sectionData) return null;
      
      console.log("Retrieved section data:", sectionData);
      
      // Process section details to get strengths and weaknesses
      const strengths = sectionData.section_details
        .filter((detail: any) => detail.detail_type === 'strength')
        .map((detail: any) => detail.content);
        
      const weaknesses = sectionData.section_details
        .filter((detail: any) => detail.detail_type === 'weakness')
        .map((detail: any) => detail.content);
      
      // Get the detailed content from the description field for now
      const detailedContent = sectionData.description || '';
      
      console.log("Mapped section with strengths:", strengths.length, "weaknesses:", weaknesses.length);
      
      return {
        id: sectionData.id,
        title: sectionData.title,
        type: sectionData.type,
        score: Number(sectionData.score),
        description: sectionData.description || '',
        detailedContent,
        strengths,
        weaknesses,
        createdAt: sectionData.created_at,
        updatedAt: sectionData.updated_at,
      };
    },
    enabled: !!companyId && !!sectionId,
    meta: {
      onError: (err: any) => {
        toast({
          title: 'Error loading section',
          description: err.message || 'Failed to load section details',
          variant: 'destructive',
        });
      },
    },
  });

  return {
    section,
    isLoading,
    error,
  };
}

// Helper functions to check access permissions
async function checkUserOwnsCompany(companyId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('user_id', userId)
    .maybeSingle();
    
  return !!data;
}

async function checkPublicSubmission(reportId: string | null): Promise<boolean> {
  if (!reportId) return false;
  
  const { data, error } = await supabase
    .from('reports')
    .select('is_public_submission')
    .eq('id', reportId)
    .maybeSingle();
    
  return data?.is_public_submission === true;
}
