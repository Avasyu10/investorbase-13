
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
          // Direct UUID lookup - fetch company with sections and section details
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select(`
              *, 
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
            
            // Fetch sections separately with their details
            const { data: sectionsData, error: sectionsError } = await supabase
              .from('sections')
              .select(`
                *,
                section_details(*)
              `)
              .eq('company_id', companyId)
              .order('created_at', { ascending: true });
              
            if (sectionsError) {
              console.error('Error fetching sections:', sectionsError);
            } else {
              console.log('Fetched sections with details:', sectionsData);
            }
            
            // Transform company data with properly populated sections
            const transformedCompany = transformCompanyDataWithSections(companyData, sectionsData || []);
            setCompany(transformedCompany);
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
            
            // Fetch sections separately with their details
            const { data: sectionsData, error: sectionsError } = await supabase
              .from('sections')
              .select(`
                *,
                section_details(*)
              `)
              .eq('company_id', companyUuid)
              .order('created_at', { ascending: true });
              
            if (sectionsError) {
              console.error('Error fetching sections:', sectionsError);
            } else {
              console.log('Fetched sections with details:', sectionsData);
            }
            
            const transformedCompany = transformCompanyDataWithSections(companyData, sectionsData || []);
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
  
  function transformCompanyDataWithSections(rawData: any, sectionsData: any[]): CompanyDetailed {
    // Extract company_details if they exist
    const companyDetails = rawData.company_details?.[0] || {};
    
    // Console log for debugging
    console.log('Raw company data:', rawData);
    console.log('Company details:', companyDetails);
    console.log('Raw sections data:', sectionsData);
    
    // Transform sections with proper content
    const transformedSections = sectionsData.map((section: any) => {
      console.log('Transforming section:', section);
      
      // Combine description from section table and section_details
      let description = section.description || '';
      
      // If description is empty, try to build it from section_details
      if (!description && section.section_details && section.section_details.length > 0) {
        const detailContents = section.section_details.map((detail: any) => detail.content).filter(Boolean);
        if (detailContents.length > 0) {
          description = detailContents.join('\n\n');
        }
      }
      
      // If still no description, use a default message
      if (!description) {
        description = `This section provides analysis of ${section.title.toLowerCase()} for the company. Detailed content is being processed.`;
      }
      
      return {
        id: section.id,
        title: section.title,
        type: section.type,
        score: section.score,
        description: description,
        createdAt: section.created_at,
        updatedAt: section.updated_at,
      };
    });
    
    console.log('Transformed sections:', transformedSections);
    
    return {
      id: rawData.id,
      name: rawData.name,
      overallScore: rawData.overall_score,
      reportId: rawData.report_id,
      perplexityResponse: rawData.perplexity_response,
      perplexityRequestedAt: rawData.perplexity_requested_at,
      assessmentPoints: rawData.assessment_points || [],
      sections: transformedSections,
      // Explicitly incorporate company details information 
      website: companyDetails.website || "",
      industry: companyDetails.industry || "",
      stage: companyDetails.stage || "",
      introduction: companyDetails.introduction || rawData.introduction || "",
      createdAt: rawData.created_at,
      updatedAt: rawData.updated_at,
    };
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
          description: section.description || `Analysis for ${section.title.toLowerCase()} section.`,
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
