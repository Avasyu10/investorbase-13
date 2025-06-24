
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCallback } from 'react';

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (companyId: string) => {
      console.log('Starting company deletion process for:', companyId);
      
      try {
        // Use a transaction-like approach by handling each step carefully
        
        // 1. First, get all sections for this company
        console.log('Fetching sections for company:', companyId);
        const { data: sections, error: sectionsSelectError } = await supabase
          .from('sections')
          .select('id')
          .eq('company_id', companyId);

        if (sectionsSelectError) {
          console.error('Error fetching sections:', sectionsSelectError);
          throw sectionsSelectError;
        }

        // 2. Delete section_details for all sections
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
          console.log('Successfully deleted section_details');
        }

        // 3. Delete sections
        console.log('Deleting sections for company:', companyId);
        const { error: sectionsError } = await supabase
          .from('sections')
          .delete()
          .eq('company_id', companyId);

        if (sectionsError) {
          console.error('Error deleting sections:', sectionsError);
          throw sectionsError;
        }
        console.log('Successfully deleted sections');

        // 4. Delete market_research records (this is causing the constraint issue)
        console.log('Deleting market_research records for company:', companyId);
        const { error: marketResearchError } = await supabase
          .from('market_research')
          .delete()
          .eq('company_id', companyId);

        if (marketResearchError) {
          console.error('Error deleting market research:', marketResearchError);
          throw marketResearchError;
        }
        console.log('Successfully deleted market_research records');

        // 5. Delete investor_research records
        console.log('Deleting investor_research records for company:', companyId);
        const { error: investorResearchError } = await supabase
          .from('investor_research')
          .delete()
          .eq('company_id', companyId);

        if (investorResearchError) {
          console.error('Error deleting investor research:', investorResearchError);
          throw investorResearchError;
        }
        console.log('Successfully deleted investor_research records');

        // 6. Delete fund_thesis_analysis records
        console.log('Deleting fund_thesis_analysis records for company:', companyId);
        const { error: fundThesisError } = await supabase
          .from('fund_thesis_analysis')
          .delete()
          .eq('company_id', companyId);

        if (fundThesisError) {
          console.error('Error deleting fund thesis analysis:', fundThesisError);
          throw fundThesisError;
        }
        console.log('Successfully deleted fund_thesis_analysis records');

        // 7. Delete barc_form_submissions
        console.log('Deleting barc_form_submissions for company:', companyId);
        const { error: barcSubmissionsError } = await supabase
          .from('barc_form_submissions')
          .delete()
          .eq('company_id', companyId);

        if (barcSubmissionsError) {
          console.error('Error deleting BARC form submissions:', barcSubmissionsError);
          throw barcSubmissionsError;
        }
        console.log('Successfully deleted barc_form_submissions');

        // 8. Delete eureka_form_submissions
        console.log('Deleting eureka_form_submissions for company:', companyId);
        const { error: eurekaSubmissionsError } = await supabase
          .from('eureka_form_submissions')
          .delete()
          .eq('company_id', companyId);

        if (eurekaSubmissionsError) {
          console.error('Error deleting Eureka form submissions:', eurekaSubmissionsError);
          throw eurekaSubmissionsError;
        }
        console.log('Successfully deleted eureka_form_submissions');

        // 9. Delete company_details
        console.log('Deleting company_details for company:', companyId);
        const { error: companyDetailsError } = await supabase
          .from('company_details')
          .delete()
          .eq('company_id', companyId);

        if (companyDetailsError) {
          console.error('Error deleting company details:', companyDetailsError);
          // Don't throw here as company_details might not exist
        } else {
          console.log('Successfully deleted company_details');
        }

        // 10. Update reports to remove company reference instead of deleting
        console.log('Updating reports to remove company reference:', companyId);
        const { error: reportsUpdateError } = await supabase
          .from('reports')
          .update({ company_id: null })
          .eq('company_id', companyId);

        if (reportsUpdateError) {
          console.error('Error updating reports:', reportsUpdateError);
          // Don't throw here as this is not critical for deletion
        } else {
          console.log('Successfully updated reports to remove company reference');
        }

        // 11. Finally, delete the company itself
        console.log('Deleting company:', companyId);
        const { error: companyError } = await supabase
          .from('companies')
          .delete()
          .eq('id', companyId);

        if (companyError) {
          console.error('Error deleting company:', companyError);
          throw companyError;
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

  // Return a memoized function to prevent recreation on every render
  const deleteCompany = useCallback((companyId: string) => {
    return deleteMutation.mutateAsync(companyId);
  }, [deleteMutation]);

  return {
    deleteCompany,
    isDeleting: deleteMutation.isPending
  };
}
