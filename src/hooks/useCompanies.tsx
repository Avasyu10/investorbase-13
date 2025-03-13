
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Company {
  id: string;
  name: string;
  total_score: number;
  created_at: string;
}

export interface Section {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  score: number;
  max_score: number;
  created_at: string;
}

export interface SectionDetail {
  id: string;
  section_id: string;
  title: string;
  content: string;
  score_impact: string | null;
  created_at: string;
}

export function useCompanies() {
  const {
    data: companies,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }
      
      return data as Company[];
    },
    meta: {
      onError: (err: any) => {
        toast({
          title: 'Error loading companies',
          description: err.message || 'Failed to load companies data',
          variant: 'destructive',
        });
      },
    },
  });

  return {
    companies: companies || [],
    isLoading,
    error,
  };
}

export function useCompanyDetails(companyId: string | undefined) {
  const {
    data: company,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      // Get company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
        
      if (companyError) {
        console.error('Error fetching company:', companyError);
        throw companyError;
      }
      
      // Get company sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('company_id', companyId);
        
      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
        throw sectionsError;
      }
      
      return {
        ...companyData,
        sections: sectionsData || []
      };
    },
    enabled: !!companyId,
    meta: {
      onError: (err: any) => {
        toast({
          title: 'Error loading company',
          description: err.message || 'Failed to load company details',
          variant: 'destructive',
        });
      },
    },
  });

  return {
    company,
    isLoading,
    error,
  };
}

export function useSectionDetails(sectionId: string | undefined) {
  const {
    data: section,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['section', sectionId],
    queryFn: async () => {
      if (!sectionId) return null;
      
      // Get section data
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .single();
        
      if (sectionError) {
        console.error('Error fetching section:', sectionError);
        throw sectionError;
      }
      
      // Get section details
      const { data: detailsData, error: detailsError } = await supabase
        .from('section_details')
        .select('*')
        .eq('section_id', sectionId);
        
      if (detailsError) {
        console.error('Error fetching section details:', detailsError);
        throw detailsError;
      }
      
      return {
        ...sectionData,
        details: detailsData || []
      };
    },
    enabled: !!sectionId,
    meta: {
      onError: (err: any) => {
        toast({
          title: 'Error loading section',
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
