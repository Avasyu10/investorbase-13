
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/lib/api/apiClient';
import { CompanyDetailed } from '@/lib/api/apiContract';
import { formatCompanyData } from './utils';

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
      console.log('Fetching company details for ID:', companyId);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('Trying to fetch company details from Supabase for:', companyId);
        
        // First, check if the companyId is a full UUID (contains dashes)
        if (companyId && companyId.includes('-')) {
          // Direct UUID lookup - also fetch company_details table
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select(`
              *, 
              sections(*),
              company_details(*)
            `)
            .eq('id', companyId)
            .maybeSingle();
            
          if (companyError) {
            console.error('Error fetching company by UUID:', companyError);
            throw companyError;
          }
          
          if (companyData) {
            console.log('Found company by direct UUID lookup:', companyData);
            console.log('Sections found:', companyData.sections?.length || 0);
            const transformedCompany = transformCompanyData(companyData);
            setCompany(transformedCompany);
            
            // Fetch company details if they're not fully loaded in the first query
            if (!transformedCompany.website || !transformedCompany.stage || !transformedCompany.industry) {
              console.log('Company details are missing or incomplete, checking company_details table directly');
              
              const { data: detailsData, error: detailsError } = await supabase
                .from('company_details')
                .select('*')
                .eq('company_id', companyId)
                .maybeSingle();
                
              if (!detailsError && detailsData) {
                console.log('Found additional company details:', detailsData);
                
                // Update the company with the additional details
                setCompany(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    website: detailsData.website || prev.website || "",
                    industry: detailsData.industry || prev.industry || "",
                    stage: detailsData.stage || prev.stage || "",
                    introduction: detailsData.introduction || prev.introduction || ""
                  };
                });
              }
            }
            
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
          // Extract the UUID string from the result array
          const companyUuid = uuidData[0].id;
          console.log('Found company UUID:', companyUuid);
          
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select(`
              *, 
              sections(*),
              company_details(*)
            `)
            .eq('id', companyUuid)
            .maybeSingle();
          
          if (companyError) {
            console.error('Error fetching company details:', companyError);
            throw companyError;
          }
          
          if (companyData) {
            console.log('Successfully fetched company details:', companyData);
            console.log('Sections found:', companyData.sections?.length || 0);
            const transformedCompany = transformCompanyData(companyData);
            
            // Fetch company details if they're not fully loaded in the first query
            if (!transformedCompany.website || !transformedCompany.stage || !transformedCompany.industry) {
              console.log('Company details are missing or incomplete, checking company_details table directly');
              
              const { data: detailsData, error: detailsError } = await supabase
                .from('company_details')
                .select('*')
                .eq('company_id', companyUuid)
                .maybeSingle();
                
              if (!detailsError && detailsData) {
                console.log('Found additional company details:', detailsData);
                
                // Update the company with the additional details
                setCompany(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    website: detailsData.website || prev.website || "",
                    industry: detailsData.industry || prev.industry || "",
                    stage: detailsData.stage || prev.stage || "",
                    introduction: detailsData.introduction || prev.introduction || ""
                  };
                });
              }
            }
            
            setCompany(transformedCompany);
            setIsLoading(false);
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
    // Extract company_details if they exist
    const companyDetails = rawData.company_details?.[0] || {};
    
    // Console log for debugging
    console.log('Raw company data:', rawData);
    console.log('Company details:', companyDetails);
    console.log('Raw sections data:', rawData.sections);
    
    return {
      id: rawData.id,
      name: rawData.name,
      overallScore: rawData.overall_score,
      reportId: rawData.report_id,
      perplexityResponse: rawData.perplexity_response,
      perplexityRequestedAt: rawData.perplexity_requested_at,
      assessmentPoints: rawData.assessment_points || [],
      sections: rawData.sections?.map((section: any) => {
        console.log('Transforming section:', section);
        return {
          id: section.id,
          title: section.title,
          type: section.type,
          score: section.score,
          description: section.description,
          createdAt: section.created_at,
          updatedAt: section.updated_at,
        };
      }) || [],
      // Explicitly incorporate company details information 
      website: companyDetails.website || "",
      industry: companyDetails.industry || "",
      stage: companyDetails.stage || "",
      introduction: companyDetails.introduction || rawData.introduction || "",
      createdAt: rawData.created_at,
      updatedAt: rawData.updated_at,
    };
  }
  
  return { company, isLoading };
}
