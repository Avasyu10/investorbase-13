
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/lib/api/apiClient';
import { CompanyDetailed } from '@/lib/api/apiContract';
import { formatCompanyData } from './utils';
import { autoAnalyzePublicReport } from '@/lib/supabase/analysis';

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
            
            // If there's a report_id and the company is from a public submission,
            // check if it should be auto-analyzed
            if (companyData.report_id && companyData.source === 'public_url') {
              try {
                await autoAnalyzePublicReport(companyData.report_id);
              } catch (autoAnalyzeError) {
                console.error('Non-blocking error checking auto-analyze:', autoAnalyzeError);
                // Non-blocking, continue with rendering the company
              }
            }
            
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
          // Extract the UUID string from the result array
          const companyUuid = uuidData[0].id;
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
            
            // If there's a report_id and the company is from a public submission,
            // check if it should be auto-analyzed
            if (companyData.report_id && companyData.source === 'public_url') {
              try {
                await autoAnalyzePublicReport(companyData.report_id);
              } catch (autoAnalyzeError) {
                console.error('Non-blocking error checking auto-analyze:', autoAnalyzeError);
                // Non-blocking, continue with rendering the company
              }
            }
            
            return;
          }
        }
        
        console.log('No company found in Supabase, falling back to mock API');
      }
      
      // Fallback to mock API
      const companyResult = await apiClient.getCompany(Number(companyId));
      
      if (companyResult?.data) {
        console.log('Fetched company from mock API:', companyResult.data);
        setCompany(companyResult.data);
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
        createdAt: section.created_at,
        updatedAt: section.updated_at,
      })) || [],
      createdAt: rawData.created_at,
      updatedAt: rawData.updated_at,
    };
  }
  
  return { company, isLoading };
}
