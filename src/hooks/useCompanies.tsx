
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { CompanyListItem, CompanyDetailed, SectionDetailed, ApiError } from '@/lib/api/apiContract';
import { toast } from '@/components/ui/use-toast';

export function useCompanies() {
  const {
    data: companies,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.getCompanies();
      return response.data;
    },
    meta: {
      onError: (err: ApiError) => {
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

export function useCompanyDetails(companyId: number | undefined) {
  const {
    data: company,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const response = await api.getCompany(companyId);
      return response.data;
    },
    enabled: !!companyId,
    meta: {
      onError: (err: ApiError) => {
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

export function useSectionDetails(companyId: number | undefined, sectionId: number | undefined) {
  const {
    data: section,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['section', companyId, sectionId],
    queryFn: async () => {
      if (!companyId || !sectionId) return null;
      const response = await api.getSection(companyId, sectionId);
      return response.data;
    },
    enabled: !!companyId && !!sectionId,
    meta: {
      onError: (err: ApiError) => {
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
