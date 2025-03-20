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
              id: parseInt(item.id.split('-')[0], 16),
              name: item.name,
              overallScore: item.overall_score,
              createdAt: item.created_at,
              updatedAt: item.created_at,
              assessmentPoints: item.assessment_points || [],
              source: isFromPublicSubmission ? 'public' : 'dashboard',
              reportId: item.report_id
            };
          });
          
          setCompanies(formattedCompanies);
          setTotalCount(count || data.length);
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
          setTotalCount(paginationData?.total || paginatedData.length);
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
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .select('*, sections(*)')
              .eq('id', companyId)
              .maybeSingle();
              
            if (companyError) {
              console.error('Error fetching company from Supabase:', companyError);
              throw companyError;
            }
            
            if (companyData) {
              console.log('Found company in Supabase:', companyData);
              const formattedCompany: CompanyDetailed = {
                id: parseInt(companyData.id.split('-')[0], 16),
                name: companyData.name,
                overallScore: companyData.overall_score,
                createdAt: companyData.created_at,
                updatedAt: companyData.updated_at,
                sections: companyData.sections.map((section: any) => ({
                  id: section.id,
                  type: section.type as any,
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
          } catch (err) {
            console.error('Error processing Supabase company data:', err);
          }
        }
        
        console.log('Falling back to mock API for company details');
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
