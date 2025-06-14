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
      )
    `)
    .eq('id', companyId)
    .single();

  if (error) {
    console.error("Error fetching company details:", error);
    throw new Error(`Failed to fetch company details: ${error.message}`);
  }

  if (data) {
    // Ensure all required properties exist
    const companyData: CompanyDetailed = {
      id: data.id,
      name: data.name,
      description: data.description || '',
      website: data.website || '',
      stage: data.stage || '',
      industry: data.industry || '',
      introduction: data.introduction || '',
      reportId: data.report_id || '',
      report_id: data.report_id || '',
      created_at: data.created_at,
      updated_at: data.updated_at,
      sections: data.sections || [],
      overall_score: data.overall_score || 0,
      analysis_status: data.analysis_status || 'pending',
      linkedin_url: data.linkedin_url || '',
      linkedin_data: data.linkedin_data || null,
      user_id: data.user_id || ''
    };

    return companyData;
  }

  return null;
};

export default useCompanyDetails;
