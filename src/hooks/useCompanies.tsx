
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { CompanyListItem, CompanyDetailed, SectionDetailed } from '@/lib/api/apiContract';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
          const formattedCompanies: CompanyListItem[] = data.map(item => {
            // Convert UUID to a numeric-looking ID for display
            // Takes the first 8 characters of the UUID and converts to a number
            const numericId = parseInt(item.id.replace(/-/g, '').substring(0, 8), 16);
            
            return {
              id: numericId,
              name: item.name,
              overallScore: item.overall_score,
              createdAt: item.created_at,
              updatedAt: item.created_at,
              assessmentPoints: item.assessment_points || [],
              source: 'dashboard',
              reportId: item.report_id
            };
          });
          
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
          // Fix for TypeScript error: safely access 'total' with a fallback
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
                
                // Convert UUID to a numeric-looking ID for display
                const numericId = parseInt(companyData.id.replace(/-/g, '').substring(0, 8), 16);
                
                const formattedCompany: CompanyDetailed = {
                  id: numericId,
                  name: companyData.name,
                  overallScore: companyData.overall_score,
                  createdAt: companyData.created_at,
                  updatedAt: companyData.updated_at,
                  sections: companyData.sections.map((section: any) => ({
                    id: section.id,
                    type: section.type,
                    title: section.title,
                    score: section.score,
                    description: section.description,
                    createdAt: section.created_at,
                    updatedAt: section.updated_at
                  })),
                  assessmentPoints: companyData.assessment_points || [],
                  perplexityResponse: companyData.perplexity_response,
                  perplexityPrompt: companyData.perplexity_prompt,
                  perplexityRequestedAt: companyData.perplexity_requested_at,
                  reportId: companyData.report_id
                };
                
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
              
              const detailedContent = sectionDetails?.find(detail => detail.detail_type === 'content')?.content || '';
              
              const formattedSection: SectionDetailed = {
                id: sectionData.id,
                type: sectionData.type,
                title: sectionData.title,
                score: sectionData.score,
                description: sectionData.description || '',
                strengths: strengths,
                weaknesses: weaknesses,
                detailedContent: detailedContent || sectionData.description || '',
                createdAt: sectionData.created_at,
                updatedAt: sectionData.updated_at
              };
              
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
