
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { CompanyDetailed } from '@/lib/api/apiContract';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { mapDbCompanyToDetailed } from './utils';

export function useCompanyDetails(companyId?: string) {
  const [company, setCompany] = useState<CompanyDetailed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    async function fetchCompanyDetails() {
      try {
        setIsLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('Trying to fetch company details from Supabase for:', companyId);
          
          // Use the RPC function to find the company UUID by numeric ID
          const { data: foundCompanyData, error: rpcError } = await supabase
            .rpc('find_company_by_numeric_id_bigint', { numeric_id: companyId });
            
          if (rpcError) {
            console.error('Error finding company by numeric ID:', rpcError);
          } else {
            console.log('Found company UUID:', foundCompanyData);
            
            // Make sure we got a valid UUID back
            if (foundCompanyData && foundCompanyData.length > 0) {
              const companyUuid = foundCompanyData[0];
              
              // Get the company details using the UUID
              const { data: companyData, error: companyError } = await supabase
                .from('companies')
                .select('*, sections(*)')
                .eq('id', companyUuid)
                .maybeSingle();
                
              if (companyError) {
                console.error('Error fetching company from Supabase:', companyError);
              } else if (companyData) {
                console.log('Found company in Supabase:', companyData);
                
                const formattedCompany = mapDbCompanyToDetailed(companyData, companyData.sections || []);
                
                setCompany(formattedCompany);
                setIsLoading(false);
                setError(null);
                return;
              }
            }
          }
        }
        
        console.log('Falling back to mock API for company details');
        // Convert the string ID to a number for the mock API
        const numericId = parseInt(companyId);
        if (isNaN(numericId)) {
          throw new Error('Invalid company ID');
        }

        const response = await api.getCompany(numericId);
        setCompany(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch company details:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setCompany(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompanyDetails();
  }, [companyId]);

  return { company, isLoading, error };
}
