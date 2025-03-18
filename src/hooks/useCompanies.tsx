
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Map Supabase DB types to API contract types
function mapDbCompanyToApi(company: any) {
  return {
    id: company.id,
    name: company.name,
    overallScore: company.overall_score,
    createdAt: company.created_at,
    updatedAt: company.updated_at || company.created_at,
    score: company.overall_score, // For backward compatibility
    assessmentPoints: company.assessment_points || [],
    reportId: company.report_id,
    perplexityResponse: company.perplexity_response,
    perplexityPrompt: company.perplexity_prompt,
    perplexityRequestedAt: company.perplexity_requested_at,
    userId: company.user_id
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

export function useCompanies() {
  const {
    data: companies,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      // Check for authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        return [];
      }
      
      // Make a direct query with the supabase client to allow RLS to automatically filter results
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching companies:", error);
        throw error;
      }

      console.log(`Found ${data.length} companies for user ${user.id}`);
      return data.map(mapDbCompanyToApi);
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
    companies: companies || [],
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
      
      // Check for authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }
      
      // Direct use of supabase client to leverage RLS
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();
        
      if (companyError) {
        console.error("Error fetching company:", companyError);
        throw companyError;
      }
      
      if (!companyData) {
        console.log(`Company ${companyId} not found or does not belong to user ${user.id}`);
        return null;
      }
      
      // RLS will filter sections to only those of companies owned by the user
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });
        
      if (sectionsError) {
        console.error("Error fetching sections:", sectionsError);
        throw sectionsError;
      }
      
      console.log(`Found ${sectionsData?.length || 0} sections for company ${companyId}`);
      
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
      
      // Check for authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }
      
      // RLS will filter sections to only those of companies owned by the user
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .eq('company_id', companyId)
        .maybeSingle();
        
      if (sectionError) throw sectionError;
      if (!sectionData) return null;
      
      console.log("Retrieved section data:", sectionData);
      
      // RLS will filter section_details to only those of sections owned by the user
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
