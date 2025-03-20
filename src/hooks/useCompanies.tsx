
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { CompanyListItem, CompanyDetailed, SectionDetailed } from '@/lib/api/apiContract';
import { supabase } from '@/integrations/supabase/client';

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
            const isFromPublicSubmission = item.report_id && !!item.user_id;
            return {
              id: item.id ? parseInt(item.id.toString().split('-')[0], 16) : 0,
              name: item.name,
              overallScore: item.overall_score,
              createdAt: item.created_at,
              updatedAt: item.created_at,
              assessmentPoints: item.assessment_points || [],
              source: 'dashboard', // Set all sources to 'dashboard'
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
          try {
            // Check if the companyId is a UUID or a numeric ID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);
            
            if (isUuid) {
              // If it's a UUID, use eq with the UUID directly
              const { data, error } = await supabase
                .from('companies')
                .select('*, sections(*)')
                .eq('id', companyId)
                .maybeSingle();
              
              if (error) {
                console.error('Error fetching company from Supabase (UUID):', error);
                throw error;
              }
              
              if (data) {
                console.log('Found company in Supabase with UUID:', data);
                const formattedCompany = formatCompanyData(data);
                setCompany(formattedCompany);
                setError(null);
                setIsLoading(false);
                return;
              }
            } else {
              // For numeric IDs, we need to cast the comparison or use a different approach
              // Convert the companyId to a number to ensure it's valid
              const numericId = parseInt(companyId);
              if (isNaN(numericId)) {
                throw new Error('Invalid company ID format');
              }
              
              console.log('Searching for company with numeric ID:', numericId);
              
              // First try a direct text match on the numeric part of the ID
              const { data, error } = await supabase
                .from('companies')
                .select('*, sections(*)')
                .textSearch('id', numericId.toString())
                .maybeSingle();
              
              if (error && error.code !== 'PGRST116') {  // Ignore "No rows returned" error
                console.error('Error searching for company by numeric ID:', error);
                // Continue to other methods - don't throw yet
              }
              
              if (data) {
                console.log('Found company in Supabase with numeric ID search:', data);
                const formattedCompany = formatCompanyData(data);
                setCompany(formattedCompany);
                setError(null);
                setIsLoading(false);
                return;
              }
              
              // If text search didn't work, try using custom RPC function
              // Note: This is a custom function that needs to be created in the database
              console.log('Trying RPC function with numeric ID:', numericId.toString());
              const { data: rpcData, error: rpcError } = await supabase
                .rpc('find_company_by_numeric_id', { 
                  numeric_id: numericId.toString() 
                });
              
              if (rpcError) {
                console.error('Error from RPC function:', rpcError);
                // Continue to fallback
              }
              
              if (rpcData && Array.isArray(rpcData) && rpcData.length > 0 && rpcData[0]?.id) {
                const companyUuid = rpcData[0].id;
                console.log('Found company UUID via RPC:', companyUuid);
                
                const { data: companyData, error: companyError } = await supabase
                  .from('companies')
                  .select('*, sections(*)')
                  .eq('id', companyUuid)
                  .maybeSingle();
                
                if (companyError) {
                  console.error('Error fetching company after RPC:', companyError);
                } else if (companyData) {
                  console.log('Found company via RPC:', companyData);
                  const formattedCompany = formatCompanyData(companyData);
                  setCompany(formattedCompany);
                  setError(null);
                  setIsLoading(false);
                  return;
                }
              } else if (rpcData && typeof rpcData === 'object' && 'id' in rpcData) {
                // Handle case where RPC returns a single object instead of an array
                const companyUuid = rpcData.id;
                console.log('Found company UUID via RPC (single object):', companyUuid);
                
                const { data: companyData, error: companyError } = await supabase
                  .from('companies')
                  .select('*, sections(*)')
                  .eq('id', companyUuid)
                  .maybeSingle();
                
                if (companyError) {
                  console.error('Error fetching company after RPC (single object):', companyError);
                } else if (companyData) {
                  console.log('Found company via RPC (single object):', companyData);
                  const formattedCompany = formatCompanyData(companyData);
                  setCompany(formattedCompany);
                  setError(null);
                  setIsLoading(false);
                  return;
                }
              }
            }
          } catch (err) {
            console.error('Error processing Supabase company data:', err);
          }
        }
        
        console.log('Falling back to mock API for company details');
        // Try to convert the string ID to a number
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

    // Helper function to format company data
    function formatCompanyData(data: any): CompanyDetailed {
      return {
        id: data.id ? parseInt(data.id.toString().split('-')[0], 16) : 0,
        name: data.name,
        overallScore: data.overall_score,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        sections: data.sections ? data.sections.map((section: any) => ({
          id: section.id,
          type: section.type as any,
          title: section.title,
          score: section.score,
          description: section.description,
          createdAt: section.created_at,
          updatedAt: section.updated_at
        })) : [],
        assessmentPoints: data.assessment_points || [],
        perplexityResponse: data.perplexity_response,
        perplexityPrompt: data.perplexity_prompt,
        perplexityRequestedAt: data.perplexity_requested_at,
        reportId: data.report_id
      };
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
            const { data: sectionData, error: sectionError } = await supabase
              .from('sections')
              .select('*')
              .eq('id', sectionId)
              .eq('company_id', companyId)
              .maybeSingle();
              
            if (sectionError) {
              console.error('Error fetching section from Supabase:', sectionError);
              throw sectionError;
            }
            
            if (sectionData) {
              console.log('Found section in Supabase:', sectionData);
              
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
                id: parseInt(sectionData.id),
                type: sectionData.type as any,
                title: sectionData.title,
                score: sectionData.score,
                description: sectionData.description || '',
                strengths: strengths,
                weaknesses: weaknesses,
                detailedContent: detailedContent,
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
        const numericCompanyId = parseInt(companyId);
        if (isNaN(numericCompanyId)) {
          throw new Error('Invalid company ID');
        }

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
