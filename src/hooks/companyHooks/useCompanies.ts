
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { CompanyListItem } from '@/lib/api/apiContract';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { mapDbCompanyToListItem } from './utils';

export function useCompanies(
  page = 1, 
  limit = 20, 
  sortField = 'created_at', 
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        setIsLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No authenticated user, using mock data');
          fetchMockCompanies();
          return;
        }
        
        const { data, error, count } = await supabase
          .from('companies')
          .select('*', { count: 'exact' })
          .order(sortField, { ascending: sortOrder === 'asc' })
          .range((page - 1) * limit, page * limit - 1);
          
        if (error) {
          console.error('Error fetching companies from Supabase:', error);
          throw error;
        }
        
        if (data && data.length > 0) {
          const formattedCompanies: CompanyListItem[] = data.map(mapDbCompanyToListItem);
          
          setCompanies(formattedCompanies);
          setTotalCount(count ?? data.length);
          setError(null);
        } else {
          console.log('No companies found in Supabase, using mock data');
          fetchMockCompanies();
        }
      } catch (err) {
        console.error('Failed to fetch companies:', err);
        fetchMockCompanies();
      } finally {
        setIsLoading(false);
      }
    }
    
    async function fetchMockCompanies() {
      try {
        const response = await api.getCompanies({
          page,
          limit,
          sortBy: 'createdAt',
          sortOrder: sortOrder
        });
        
        if ('data' in response.data && 'pagination' in response.data) {
          const paginatedData = response.data.data as CompanyListItem[];
          setCompanies(paginatedData);
          const paginationData = response.data.pagination as { total?: number } | undefined;
          setTotalCount(paginationData?.total ?? paginatedData.length);
        } else {
          const data = response.data as CompanyListItem[];
          setCompanies(data);
          setTotalCount(data.length);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to fetch mock companies:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setCompanies([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompanies();
  }, [page, limit, sortField, sortOrder]);

  return { companies, totalCount, isLoading, error };
}
