
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CompanyDetailed } from '@/components/types';

const useCompanyDetails = (companyId: string) => {
  const [company, setCompany] = useState<CompanyDetailed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const companyDetails = await fetchCompanyDetails(companyId);
        if (companyDetails) {
          setCompany(companyDetails);
        } else {
          setError(new Error('Company details not found'));
        }
      } catch (err: any) {
        setError(err instanceof Error ? err : new Error('Failed to fetch company details'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [companyId]);

  return { company, isLoading, error };
};

const fetchCompanyDetails = async (companyId: string): Promise<CompanyDetailed | null> => {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      sections (
        *
      ),
      company_details (
        website,
        stage,
        industry,
        introduction
      )
    `)
    .eq('id', companyId)
    .single();

  if (error) {
    console.error("Error fetching company details:", error);
    throw new Error(`Failed to fetch company details: ${error.message}`);
  }

  if (data) {
    // Get company details from the related table if available
    const companyDetails = data.company_details?.[0] || {};
    
    // Ensure all required properties exist
    const companyData: CompanyDetailed = {
      id: data.id,
      name: data.name,
      description: companyDetails.introduction || '',
      website: companyDetails.website || '',
      stage: companyDetails.stage || '',
      industry: companyDetails.industry || '',
      introduction: companyDetails.introduction || '',
      reportId: data.report_id || '',
      report_id: data.report_id || '',
      created_at: data.created_at,
      updated_at: data.updated_at,
      sections: (data.sections || []).map((section: any) => ({
        ...section,
        content: section.description || '',
        strengths: [],
        weaknesses: []
      })),
      overall_score: data.overall_score || 0,
      overallScore: data.overall_score || 0,
      analysis_status: 'completed',
      linkedin_url: '',
      linkedin_data: null,
      user_id: data.user_id || '',
      assessmentPoints: data.assessment_points || []
    };

    return companyData;
  }

  return null;
};

export default useCompanyDetails;
