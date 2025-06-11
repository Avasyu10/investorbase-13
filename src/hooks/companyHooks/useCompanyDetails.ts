
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/lib/api/apiClient';
import { CompanyDetailed } from '@/lib/api/apiContract';

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
        // Try to fetch company data efficiently
        let companyData = null;
        let actualCompanyId = companyId;
        
        // First, check if the companyId is a full UUID
        if (companyId && companyId.includes('-')) {
          const { data, error } = await supabase
            .from('companies')
            .select(`
              *, 
              company_details(*),
              sections(
                *,
                section_details(*)
              )
            `)
            .eq('id', companyId)
            .maybeSingle();
            
          if (!error && data) {
            companyData = data;
          }
        } else {
          // Try to find by numeric ID
          const { data: uuidData, error: uuidError } = await supabase
            .rpc('find_company_by_numeric_id_bigint', {
              numeric_id: companyId.toString().replace(/-/g, '')
            });
          
          if (!uuidError && uuidData && uuidData.length > 0) {
            actualCompanyId = uuidData[0].id;
            
            const { data, error } = await supabase
              .from('companies')
              .select(`
                *, 
                company_details(*),
                sections(
                  *,
                  section_details(*)
                )
              `)
              .eq('id', actualCompanyId)
              .maybeSingle();
            
            if (!error && data) {
              companyData = data;
            }
          }
        }
        
        if (companyData) {
          const transformedCompany = transformCompanyData(companyData);
          setCompany(transformedCompany);
          setIsLoading(false);
          return;
        }
      }
      
      // Fallback to mock API
      const companyResult = await apiClient.getCompany(Number(companyId));
      
      if (companyResult?.data) {
        setCompany(companyResult.data);
      } else {
        setCompany(null);
      }
    } catch (error) {
      console.error('Error in fetchCompanyDetails:', error);
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  }
  
  function transformCompanyData(rawData: any): CompanyDetailed {
    const companyDetails = rawData.company_details?.[0] || {};
    
    // Transform sections with proper content handling
    const transformedSections = rawData.sections?.map((section: any) => {
      // Get description from section table first
      let description = section.description || '';
      
      // If no description, try to build from section_details
      if (!description && section.section_details && section.section_details.length > 0) {
        const detailContents = section.section_details
          .map((detail: any) => detail.content)
          .filter(Boolean);
        
        if (detailContents.length > 0) {
          description = detailContents.join('\n\n');
        }
      }
      
      // Final fallback
      if (!description) {
        description = `Analysis for ${section.title} is being processed.`;
      }
      
      return {
        id: section.id,
        title: section.title,
        type: section.type,
        score: section.score || 0,
        description: description,
        createdAt: section.created_at,
        updatedAt: section.updated_at,
      };
    }) || [];
    
    return {
      id: rawData.id,
      name: rawData.name,
      overallScore: rawData.overall_score || 0,
      reportId: rawData.report_id,
      perplexityResponse: rawData.perplexity_response,
      perplexityRequestedAt: rawData.perplexity_requested_at,
      assessmentPoints: rawData.assessment_points || [],
      sections: transformedSections,
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
