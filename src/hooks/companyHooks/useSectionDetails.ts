
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface SectionDetail {
  id: string;
  type: string;
  title: string;
  score: number;
  description: string;
  strengths: string[];
  weaknesses: string[];
  detailedContent: string;
  createdAt: string;
  updatedAt: string;
}

export function useSectionDetails(companyId: string | undefined, sectionId: string | undefined) {
  const {
    data: section,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['section-details', companyId, sectionId],
    queryFn: async () => {
      if (!companyId || !sectionId) return null;
      
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to view section details',
          variant: 'destructive',
        });
        return null;
      }
      
      // First verify the user has access to this company
      const { data: companyCheck, error: companyCheckError } = await supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (companyCheckError) {
        console.error("Error checking company access:", companyCheckError);
        throw companyCheckError;
      }
      
      if (!companyCheck) {
        console.error('Access denied to company');
        toast({
          title: 'Access denied',
          description: 'You do not have permission to view this section',
          variant: 'destructive',
        });
        return null;
      }
      
      // Get the section data
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .eq('company_id', companyId)
        .maybeSingle();
        
      if (sectionError) throw sectionError;
      if (!sectionData) return null;
      
      // Get strengths and weaknesses
      const { data: detailsData, error: detailsError } = await supabase
        .from('section_details')
        .select('*')
        .eq('section_id', sectionId);
        
      if (detailsError) throw detailsError;
      
      const strengths = detailsData
        .filter(detail => detail.detail_type === 'strength')
        .map(detail => detail.content);
        
      const weaknesses = detailsData
        .filter(detail => detail.detail_type === 'weakness')
        .map(detail => detail.content);
      
      return {
        id: sectionData.id,
        type: sectionData.type,
        title: sectionData.title,
        score: Number(sectionData.score), // Ensure score is a number
        description: sectionData.description || '',
        strengths,
        weaknesses,
        // Fix: Use either description or detailed_content based on what's available
        detailedContent: sectionData.description || '',
        createdAt: sectionData.created_at,
        updatedAt: sectionData.updated_at || sectionData.created_at,
      } as SectionDetail;
    },
    enabled: !!companyId && !!sectionId,
    meta: {
      onError: (err: any) => {
        toast({
          title: 'Error loading section details',
          description: err.message || 'Failed to load section details',
          variant: 'destructive',
        });
      },
    },
  });

  return {
    section,
    isLoading,
    error,
  };
}
