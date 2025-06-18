
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      console.log('Starting company deletion process for:', companyId);
      
      try {
        // First, get all sections for this company
        const { data: sections, error: sectionsError } = await supabase
          .from('sections')
          .select('id')
          .eq('company_id', companyId);

        if (sectionsError) {
          console.error('Error fetching sections:', sectionsError);
          throw sectionsError;
        }

        console.log('Found sections:', sections?.length || 0);

        // Delete section_details for each section
        if (sections && sections.length > 0) {
          const sectionIds = sections.map(section => section.id);
          
          console.log('Deleting section_details for sections:', sectionIds);
          const { error: sectionDetailsError } = await supabase
            .from('section_details')
            .delete()
            .in('section_id', sectionIds);

          if (sectionDetailsError) {
            console.error('Error deleting section details:', sectionDetailsError);
            throw sectionDetailsError;
          }

          // Delete sections
          console.log('Deleting sections for company:', companyId);
          const { error: deleteSectionsError } = await supabase
            .from('sections')
            .delete()
            .eq('company_id', companyId);

          if (deleteSectionsError) {
            console.error('Error deleting sections:', deleteSectionsError);
            throw deleteSectionsError;
          }
        }

        // Delete all related research and analysis records
        console.log('Deleting market_research records for company:', companyId);
        const { error: marketResearchError } = await supabase
          .from('market_research')
          .delete()
          .eq('company_id', companyId);

        if (marketResearchError) {
          console.error('Error deleting market research:', marketResearchError);
          throw marketResearchError;
        }

        console.log('Deleting investor_research records for company:', companyId);
        const { error: investorResearchError } = await supabase
          .from('investor_research')
          .delete()
          .eq('company_id', companyId);

        if (investorResearchError) {
          console.error('Error deleting investor research:', investorResearchError);
          throw investorResearchError;
        }

        console.log('Deleting fund_thesis_analysis records for company:', companyId);
        const { error: fundThesisError } = await supabase
          .from('fund_thesis_analysis')
          .delete()
          .eq('company_id', companyId);

        if (fundThesisError) {
          console.error('Error deleting fund thesis analysis:', fundThesisError);
          throw fundThesisError;
        }

        // Delete BARC form submissions linked to this company
        console.log('Deleting barc_form_submissions for company:', companyId);
        const { error: barcSubmissionsError } = await supabase
          .from('barc_form_submissions')
          .delete()
          .eq('company_id', companyId);

        if (barcSubmissionsError) {
          console.error('Error deleting BARC form submissions:', barcSubmissionsError);
          throw barcSubmissionsError;
        }

        // FIXED: Delete Eureka form submissions linked to this company
        console.log('Deleting eureka_form_submissions for company:', companyId);
        const { error: eurekaSubmissionsError } = await supabase
          .from('eureka_form_submissions')
          .delete()
          .eq('company_id', companyId);

        if (eurekaSubmissionsError) {
          console.error('Error deleting Eureka form submissions:', eurekaSubmissionsError);
          throw eurekaSubmissionsError;
        }

        // Delete company_details if they exist
        console.log('Deleting company_details for company:', companyId);
        const { error: companyDetailsError } = await supabase
          .from('company_details')
          .delete()
          .eq('company_id', companyId);

        if (companyDetailsError) {
          console.error('Error deleting company details:', companyDetailsError);
          // Don't throw here as company_details might not exist
        }

        // Check if there are any reports linked to this company and update them
        console.log('Updating reports to remove company reference:', companyId);
        const { error: reportsUpdateError } = await supabase
          .from('reports')
          .update({ company_id: null })
          .eq('company_id', companyId);

        if (reportsUpdateError) {
          console.error('Error updating reports:', reportsUpdateError);
          // Don't throw here as this is not critical for deletion
        }

        // Finally, delete the company
        console.log('Deleting company:', companyId);
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', companyId);

        if (error) {
          console.error('Error deleting company:', error);
          throw error;
        }

        console.log('Company deletion completed successfully');
        return companyId;
      } catch (error) {
        console.error('Company deletion failed:', error);
        throw error;
      }
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
