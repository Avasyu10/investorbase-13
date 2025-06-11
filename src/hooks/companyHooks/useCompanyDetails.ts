
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyDetails {
  id: string;
  name: string;
  overallScore: number;
  reportId: string | null;
  perplexityResponse: string | null;
  perplexityRequestedAt: string | null;
  assessmentPoints: string[];
  sections: Array<{
    id: string;
    title: string;
    type: string;
    score: number;
    description: string;
    createdAt: string;
    updatedAt: string;
  }>;
  website: string;
  industry: string;
  stage: string;
  introduction: string;
  createdAt: string;
  updatedAt: string;
}

export const useCompanyDetails = (id: string) => {
  const query = useQuery({
    queryKey: ['company', id],
    queryFn: async (): Promise<CompanyDetails | null> => {
      console.log('Fetching company details for ID:', id);
      
      if (!id) {
        console.log('No company ID provided');
        return null;
      }

      let companyQuery;
      
      // Check if ID looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        console.log('Fetching by UUID:', id);
        companyQuery = supabase
          .from('companies')
          .select(`
            *,
            sections (*),
            company_details (
              website,
              industry,
              stage,
              introduction
            )
          `)
          .eq('id', id)
          .single();
      } else {
        console.log('Fetching by numeric ID:', id);
        const numericId = parseInt(id, 10);
        companyQuery = supabase.rpc('get_company_by_numeric_id', { 
          p_numeric_id: numericId 
        });
      }

      const { data: company, error } = await companyQuery;

      if (error) {
        console.error('Error fetching company:', error);
        throw error;
      }

      if (!company) {
        console.log('Company not found');
        return null;
      }

      console.log('Found company by UUID:', company.name);

      // If we used the RPC function, we need to fetch sections separately
      if (!isUUID) {
        const { data: sections, error: sectionsError } = await supabase
          .from('sections')
          .select('*')
          .eq('company_id', company.id);

        if (sectionsError) {
          console.error('Error fetching sections:', sectionsError);
          throw sectionsError;
        }

        company.sections = sections || [];
      }

      console.log('Fetched sections:', company.sections?.length || 0, 'sections');

      const transformedCompany = transformCompanyData(company);
      
      return transformedCompany;
    },
    enabled: !!id
  });

  return {
    company: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
};

function transformCompanyData(company: any): CompanyDetails {
  console.log('Transforming company data with', company.sections?.length || 0, 'sections');
  
  // Get company details from the related table
  const companyDetails = Array.isArray(company.company_details) 
    ? company.company_details[0] 
    : company.company_details;

  const sections = (company.sections || []).map((section: any) => {
    console.log('Processing section:', section.title, 'Type:', section.type);
    
    const transformedSection = {
      id: section.id,
      title: section.title,
      type: section.type,
      score: Number(section.score) || 0,
      description: section.description || '',
      createdAt: section.created_at,
      updatedAt: section.updated_at
    };
    
    console.log('Section', section.title, 'final description length:', transformedSection.description.length);
    
    return transformedSection;
  });

  console.log('Final transformed sections count:', sections.length);

  return {
    id: company.id,
    name: company.name,
    overallScore: Number(company.overall_score) || 0,
    reportId: company.report_id,
    perplexityResponse: company.perplexity_response,
    perplexityRequestedAt: company.perplexity_requested_at,
    assessmentPoints: company.assessment_points || [],
    sections,
    website: companyDetails?.website || '',
    industry: companyDetails?.industry || '',
    stage: companyDetails?.stage || '',
    introduction: companyDetails?.introduction || '',
    createdAt: company.created_at,
    updatedAt: company.updated_at
  };
}
