
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/lib/api/apiClient';
import { SectionDetailed } from '@/lib/api/apiContract';

export function useSectionDetails(
  companyId: string | undefined,
  sectionId: string | undefined
) {
  const [section, setSection] = useState<SectionDetailed | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!companyId || !sectionId) {
      setIsLoading(false);
      return;
    }

    fetchSectionDetails();
  }, [companyId, sectionId]);

  async function fetchSectionDetails() {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('Trying to fetch section details from Supabase:', { companyId, sectionId });
        
        let companyUuid = companyId;
        
        // If companyId doesn't look like a UUID, try to find the UUID
        if (companyId && !companyId.includes('-')) {
          const { data: uuidData, error: uuidError } = await supabase
            .rpc('find_company_by_numeric_id_bigint', {
              numeric_id: companyId.toString().replace(/-/g, '')
            });
          
          if (uuidError) {
            console.error('Error finding company UUID by numeric ID:', uuidError);
            throw uuidError;
          }
          
          if (uuidData && uuidData.length > 0) {
            companyUuid = uuidData[0];
            console.log('Converted numeric ID to UUID:', companyUuid);
          }
        }
        
        // Now fetch the section using the UUID
        const { data: sectionData, error: sectionError } = await supabase
          .from('sections')
          .select(`
            *,
            section_details!section_id(*)
          `)
          .eq('id', sectionId)
          .eq('company_id', companyUuid)
          .maybeSingle();
        
        if (sectionError) {
          console.error('Error fetching section details:', sectionError);
          throw sectionError;
        }
        
        if (sectionData) {
          console.log('Successfully fetched section details:', sectionData);
          
          const transformedSection: SectionDetailed = {
            id: sectionData.id,
            title: sectionData.title,
            type: sectionData.type,
            score: sectionData.score,
            description: sectionData.description || '',
            detailedContent: sectionData.detailed_content || '',
            strengths: sectionData.section_details
              ?.filter((detail: any) => detail.detail_type === 'strength')
              .map((detail: any) => detail.content) || [],
            weaknesses: sectionData.section_details
              ?.filter((detail: any) => detail.detail_type === 'weakness')
              .map((detail: any) => detail.content) || [],
            createdAt: sectionData.created_at,
            updatedAt: sectionData.updated_at,
          };
          
          setSection(transformedSection);
          setIsLoading(false);
          return;
        }
        
        console.log('No section found in Supabase, falling back to mock API');
      }
      
      // Fallback to mock API
      const sectionResult = await apiClient.getSection(Number(companyId), sectionId);
      
      if (sectionResult?.data) {
        console.log('Fetched section from mock API:', sectionResult.data);
        setSection(sectionResult.data);
      } else {
        console.error('Section not found in mock API either');
        setSection(null);
      }
    } catch (error) {
      console.error('Error in fetchSectionDetails:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return { section, isLoading };
}
