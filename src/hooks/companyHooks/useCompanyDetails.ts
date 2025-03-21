
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ApiClient } from '@/lib/api/apiClient';
import { Company, CompanyDetailed } from '@/lib/api/apiContract';

export function useCompanyDetails(companyId: string | undefined) {
  const [company, setCompany] = useState<CompanyDetailed | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }
    
    fetchCompanyDetails();
  }, [companyId]);
  
  async function fetchCompanyDetails() {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('Trying to fetch company details from Supabase for:', companyId);
        
        // First, check if the companyId is a full UUID (contains dashes)
        if (companyId && companyId.includes('-')) {
          // Direct UUID lookup
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*, sections(*)')
            .eq('id', companyId)
            .maybeSingle();
            
          if (companyError) {
            console.error('Error fetching company by UUID:', companyError);
            throw companyError;
          }
          
          if (companyData) {
            console.log('Found company by direct UUID lookup:', companyData);
            setCompany(transformCompanyData(companyData));
            setIsLoading(false);
            return;
          }
        }
        
        // If companyId is numeric or UUID lookup failed, try to find by numeric ID
        console.log('Attempting to find company by numeric ID:', companyId);
        
        const { data: uuidData, error: uuidError } = await supabase
          .rpc('find_company_by_numeric_id_bigint', {
            numeric_id: companyId.toString().replace(/-/g, '')
          });
        
        if (uuidError) {
          console.error('Error finding company UUID by numeric ID:', uuidError);
          throw uuidError;
        }
        
        if (uuidData && uuidData.length > 0) {
          const companyUuid = uuidData[0];
          console.log('Found company UUID:', companyUuid);
          
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*, sections(*)')
            .eq('id', companyUuid)
            .maybeSingle();
          
          if (companyError) {
            console.error('Error fetching company details:', companyError);
            throw companyError;
          }
          
          if (companyData) {
            console.log('Successfully fetched company details:', companyData);
            setCompany(transformCompanyData(companyData));
            setIsLoading(false);
            return;
          }
        }
        
        console.log('No company found in Supabase, falling back to mock API');
      }
      
      // Fallback to mock API if not found in Supabase or user not logged in
      const apiClient = new ApiClient();
      const companyResult = await apiClient.getCompanyById(companyId);
      
      if (companyResult) {
        console.log('Fetched company from mock API:', companyResult);
        setCompany(companyResult);
      } else {
        console.error('Company not found in mock API either');
        setCompany(null);
      }
    } catch (error) {
      console.error('Error in fetchCompanyDetails:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  function transformCompanyData(rawData: any): CompanyDetailed {
    return {
      id: rawData.id,
      name: rawData.name,
      overallScore: rawData.overall_score,
      reportId: rawData.report_id,
      perplexityResponse: rawData.perplexity_response,
      perplexityRequestedAt: rawData.perplexity_requested_at,
      assessmentPoints: rawData.assessment_points || [],
      sections: rawData.sections?.map((section: any) => ({
        id: section.id,
        title: section.title,
        type: section.type,
        score: section.score,
        description: section.description,
      })) || [],
    };
  }
  
  return { company, isLoading };
}
