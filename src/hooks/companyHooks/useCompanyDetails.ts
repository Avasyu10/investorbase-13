
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
        console.log('Fetching company details for ID:', companyId);
        
        // Try to fetch company data efficiently
        let companyData = null;
        let actualCompanyId = companyId;
        
        // First, check if the companyId is a full UUID
        if (companyId && companyId.includes('-')) {
          console.log('Fetching by UUID:', companyId);
          const { data, error } = await supabase
            .from('companies')
            .select(`
              *, 
              company_details(*)
            `)
            .eq('id', companyId)
            .maybeSingle();
            
          if (!error && data) {
            companyData = data;
            console.log('Found company by UUID:', data.name);
          } else {
            console.log('UUID lookup failed:', error);
          }
        } else {
          // Try to find by numeric ID
          console.log('Trying numeric ID lookup for:', companyId);
          const { data: uuidData, error: uuidError } = await supabase
            .rpc('find_company_by_numeric_id_bigint', {
              numeric_id: companyId.toString().replace(/-/g, '')
            });
          
          if (!uuidError && uuidData && uuidData.length > 0) {
            actualCompanyId = uuidData[0].id;
            console.log('Found UUID from numeric ID:', actualCompanyId);
            
            const { data, error } = await supabase
              .from('companies')
              .select(`
                *, 
                company_details(*)
              `)
              .eq('id', actualCompanyId)
              .maybeSingle();
            
            if (!error && data) {
              companyData = data;
              console.log('Found company by converted UUID:', data.name);
            }
          }
        }
        
        if (companyData) {
          // Now fetch sections separately with better error handling
          const { data: sectionsData, error: sectionsError } = await supabase
            .from('sections')
            .select(`
              id,
              title,
              type,
              score,
              description,
              created_at,
              updated_at,
              section_details(
                id,
                detail_type,
                content
              )
            `)
            .eq('company_id', actualCompanyId)
            .order('created_at', { ascending: true });
          
          if (sectionsError) {
            console.error('Error fetching sections:', sectionsError);
          } else {
            console.log('Fetched sections:', sectionsData?.length || 0, 'sections');
          }
          
          const transformedCompany = transformCompanyData(companyData, sectionsData || []);
          setCompany(transformedCompany);
          setIsLoading(false);
          return;
        }
      }
      
      // Fallback to mock API
      console.log('Falling back to mock API');
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
  
  function transformCompanyData(rawData: any, sectionsData: any[] = []): CompanyDetailed {
    const companyDetails = rawData.company_details?.[0] || {};
    
    console.log('Transforming company data with', sectionsData.length, 'sections');
    
    // Transform sections with proper content handling
    const transformedSections = sectionsData.map((section: any) => {
      console.log('Processing section:', section.title, 'Type:', section.type);
      
      // Get description from section table first
      let description = section.description || '';
      
      // If no description, try to build from section_details
      if (!description && section.section_details && section.section_details.length > 0) {
        console.log('Building description from section_details for:', section.title);
        
        // Group details by type
        const strengths = section.section_details
          .filter((detail: any) => detail.detail_type === 'strength')
          .map((detail: any) => detail.content)
          .filter(Boolean);
          
        const weaknesses = section.section_details
          .filter((detail: any) => detail.detail_type === 'weakness')
          .map((detail: any) => detail.content)
          .filter(Boolean);
        
        // Build description from strengths and weaknesses
        const parts = [];
        if (strengths.length > 0) {
          parts.push('**Strengths:**\n' + strengths.map(s => `• ${s}`).join('\n'));
        }
        if (weaknesses.length > 0) {
          parts.push('**Areas for Improvement:**\n' + weaknesses.map(w => `• ${w}`).join('\n'));
        }
        
        if (parts.length > 0) {
          description = parts.join('\n\n');
        }
      }
      
      // Final fallback
      if (!description) {
        description = `Analysis for ${section.title} is being processed.`;
      }
      
      console.log('Section', section.title, 'final description length:', description.length);
      
      return {
        id: section.id,
        title: section.title,
        type: section.type,
        score: Number(section.score) || 0,
        description: description,
        createdAt: section.created_at,
        updatedAt: section.updated_at,
      };
    });
    
    console.log('Final transformed sections count:', transformedSections.length);
    
    return {
      id: rawData.id,
      name: rawData.name,
      overallScore: Number(rawData.overall_score) || 0,
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
