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
    perplexityRequestedAt: company.perplexity_requested_at,
    website: company.website || null,
    stage: company.stage || null,
    industry: company.industry || null,
    founderLinkedIns: company.founder_linkedins || [],
    introduction: company.introduction || null
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
      
      // Get the company with RLS enforcement - explicitly checking user_id
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .eq('user_id', user.id) // Explicitly filter by user_id
        .maybeSingle();
        
      if (companyError) {
        console.error("Error fetching company details:", companyError);
        throw companyError;
      }
      
      if (!companyData) {
        console.error('Company not found or access denied');
        toast({
          title: 'Access denied',
          description: 'You do not have permission to view this company',
          variant: 'destructive',
        });
        return null;
      }
      
      // Log the raw overall score from the database
      console.log(`Raw overall_score from DB for company ${companyId}: ${companyData.overall_score}`);
      
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });
        
      if (sectionsError) throw sectionsError;
      
      // Calculate average section score for verification
      if (sectionsData && sectionsData.length > 0) {
        const sectionScores = sectionsData.map(section => section.score || 0);
        const averageScore = sectionScores.reduce((sum, score) => sum + score, 0) / 10; // Using 10 for normalization as per the prompt
        const normalizedScore = Math.min(averageScore * 1.25, 5.0);
        console.log(`Calculated scores for verification: Average=${averageScore.toFixed(2)}, Normalized=${normalizedScore.toFixed(1)}, DB Score=${companyData.overall_score}`);
      }
      
      return {
        ...mapDbCompanyToApi(companyData),
        sections: sectionsData?.map(mapDbSectionToApi) || [],
      };
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
      
      // First verify the user has access to this company
      const { data: companyCheck, error: companyCheckError } = await supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (companyCheckError) {
        console.error("Error checking company access:", companyCheckError);
        throw companyCheckError;
      }
      
      if (!companyCheck) {
        console.error('Access denied to company');
        toast({
          title: 'Access denied',
          description: 'You do not have permission to view this section',
          variant: 'destructive',
        });
        return null;
      }
      
      // Get the section data with full description
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .eq('company_id', companyId)
        .maybeSingle();
        
      if (sectionError) throw sectionError;
      if (!sectionData) return null;
      
      console.log("Retrieved section data:", sectionData);
      
      // Get strengths and weaknesses
      const { data: detailsData, error: detailsError } = await supabase
        .from('section_details')
        .select('*')
        .eq('section_id', sectionId);
        
      if (detailsError) throw detailsError;
      
      console.log("Retrieved section details:", detailsData);
      
      const strengths = detailsData
        .filter(detail => detail.detail_type === 'strength')
        .map(detail => detail.content);
        
      const weaknesses = detailsData
        .filter(detail => detail.detail_type === 'weakness')
        .map(detail => detail.content);
      
      // Get the detailed content from the description field for now
      const detailedContent = sectionData.description || '';
      
      console.log("Mapped section with strengths:", strengths.length, "weaknesses:", weaknesses.length);
      
      return {
        ...mapDbSectionToApi(sectionData),
        strengths,
        weaknesses,
        detailedContent,
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
