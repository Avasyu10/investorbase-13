
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
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
