
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { SectionDetailed } from '@/lib/api/apiContract';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { mapDbSectionToDetailed } from './utils';

export function useSectionDetails(companyId?: string, sectionId?: string) {
  const [section, setSection] = useState<SectionDetailed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!companyId || !sectionId) {
      setIsLoading(false);
      return;
    }

    async function fetchSectionDetails() {
      try {
        setIsLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('Trying to fetch section details from Supabase for:', companyId, sectionId);
          try {
            // First check if we can access the section directly
            const { data: sectionData, error: sectionError } = await supabase
              .from('sections')
              .select('*')
              .eq('id', sectionId)
              .maybeSingle();
              
            if (sectionError) {
              console.error('Error fetching section from Supabase:', sectionError);
              throw sectionError;
            }
            
            if (sectionData) {
              console.log('Found section in Supabase:', sectionData);
              
              // Now fetch the section details with proper RLS enforced
              const { data: sectionDetails, error: detailsError } = await supabase
                .from('section_details')
                .select('*')
                .eq('section_id', sectionId);
                
              if (detailsError) {
                console.error('Error fetching section details:', detailsError);
              }
              
              const strengths = sectionDetails?.filter(detail => detail.detail_type === 'strength')
                .map(strength => strength.content) || [];
              
              const weaknesses = sectionDetails?.filter(detail => detail.detail_type === 'weakness')
                .map(weakness => weakness.content) || [];
              
              const formattedSection = mapDbSectionToDetailed(sectionData, strengths, weaknesses);
              
              setSection(formattedSection);
              setIsLoading(false);
              setError(null);
              return;
            }
          } catch (err) {
            console.error('Error processing Supabase section data:', err);
          }
        }
        
        console.log('Falling back to mock API for section details');
        // Convert the string company ID to a number
        const numericCompanyId = parseInt(companyId);
        if (isNaN(numericCompanyId)) {
          throw new Error('Invalid company ID');
        }

        // Pass sectionId as a string to the API
        const response = await api.getSection(numericCompanyId, sectionId);
        setSection(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch section details:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setSection(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSectionDetails();
  }, [companyId, sectionId]);

  return { section, isLoading, error };
}
