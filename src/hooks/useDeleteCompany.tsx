
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      // First, get all sections for this company
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id')
        .eq('company_id', companyId);

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
        throw sectionsError;
      }

      // Delete section_details for each section
      if (sections && sections.length > 0) {
        const sectionIds = sections.map(section => section.id);
        
        const { error: sectionDetailsError } = await supabase
          .from('section_details')
          .delete()
          .in('section_id', sectionIds);

        if (sectionDetailsError) {
          console.error('Error deleting section details:', sectionDetailsError);
          throw sectionDetailsError;
        }

        // Delete sections
        const { error: deleteSectionsError } = await supabase
          .from('sections')
          .delete()
          .eq('company_id', companyId);

        if (deleteSectionsError) {
          console.error('Error deleting sections:', deleteSectionsError);
          throw deleteSectionsError;
        }
      }

      // Delete market_research records for this company
      const { error: marketResearchError } = await supabase
        .from('market_research')
        .delete()
        .eq('company_id', companyId);

      if (marketResearchError) {
        console.error('Error deleting market research:', marketResearchError);
        throw marketResearchError;
      }

      // Delete investor_research records for this company
      const { error: investorResearchError } = await supabase
        .from('investor_research')
        .delete()
        .eq('company_id', companyId);

      if (investorResearchError) {
        console.error('Error deleting investor research:', investorResearchError);
        throw investorResearchError;
      }

      // Delete fund_thesis_analysis records for this company
      const { error: fundThesisError } = await supabase
        .from('fund_thesis_analysis')
        .delete()
        .eq('company_id', companyId);

      if (fundThesisError) {
        console.error('Error deleting fund thesis analysis:', fundThesisError);
        throw fundThesisError;
      }

      // Delete company_details if they exist
      const { error: companyDetailsError } = await supabase
        .from('company_details')
        .delete()
        .eq('company_id', companyId);

      if (companyDetailsError) {
        console.error('Error deleting company details:', companyDetailsError);
        // Don't throw here as company_details might not exist
      }

      // Finally, delete the company
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) {
        console.error('Error deleting company:', error);
        throw error;
      }

      return companyId;
    },
    onSuccess: () => {
      // Invalidate and refetch companies query
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      
      toast({
        title: "Company deleted",
        description: "The company has been successfully removed.",
      });
    },
    onError: (error: any) => {
      console.error('Failed to delete company:', error);
      toast({
        title: "Error deleting company",
        description: error.message || "Failed to delete the company. Please try again.",
        variant: "destructive",
      });
    },
  });
}
