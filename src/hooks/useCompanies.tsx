
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
          const paginationData = response.data.pagination as { total?: number };
          setTotalCount(paginationData.total || paginatedData.length);
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
        console.log('[DEBUG] Fetching company details for ID:', companyId, 'Type:', typeof companyId);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('[DEBUG] User authenticated, trying to fetch from Supabase. User ID:', user.id);
          
          // Check if the ID is a UUID format
          const isUuid = companyId.includes('-');
          const isNumeric = /^\d+$/.test(companyId);
          
          console.log('[DEBUG] Is company ID a UUID?', isUuid);
          console.log('[DEBUG] Is company ID numeric?', isNumeric);
          
          let companyData;
          
          if (isUuid) {
            // Direct query with UUID
            console.log('[DEBUG] UUID detected, fetching directly with:', companyId);
            const { data, error } = await supabase
              .from('companies')
              .select('*, sections(*)')
              .eq('id', companyId)
              .maybeSingle();
              
            if (error) {
              console.error('[DEBUG] Error fetching company by UUID:', error);
              throw error;
            }
            
            companyData = data;
          } else if (isNumeric) {
            // For large numeric IDs, we'll use our specialized function
            console.log('[DEBUG] Numeric ID detected, using find_company_by_numeric_id for lookup');
            
            // Call a custom function that can handle large numeric IDs
            const { data, error } = await supabase.rpc('find_company_by_numeric_id', {
              numeric_id: companyId
            });
            
            if (error) {
              console.error('[DEBUG] Error fetching company by numeric ID:', error);
              console.error('[DEBUG] Trying alternative method with bigint support');
              
              try {
                // Try the second function which supports larger numbers
                const { data: bigintData, error: bigintError } = await supabase.rpc('find_company_by_numeric_id_bigint', {
                  numeric_id: companyId
                });
                
                if (bigintError) {
                  console.error('[DEBUG] Error with bigint lookup:', bigintError);
                  throw bigintError;
                }
                
                if (bigintData && Array.isArray(bigintData) && bigintData.length > 0) {
                  console.log('[DEBUG] Found company with bigint function:', bigintData[0]);
                  
                  // Use the UUID to fetch the full company data
                  const uuid = bigintData[0].id;
                  console.log('[DEBUG] Found company UUID:', uuid);
                  
                  // Now fetch the full company data with that UUID
                  const { data: companyWithSections, error: companyError } = await supabase
                    .from('companies')
                    .select('*, sections(*)')
                    .eq('id', uuid)
                    .maybeSingle();
                    
                  if (companyError) {
                    console.error('[DEBUG] Error fetching company details with UUID:', companyError);
                    throw companyError;
                  }
                  
                  companyData = companyWithSections;
                } else {
                  console.error('[DEBUG] No company found with numeric ID (bigint):', companyId);
                }
              } catch (bigintLookupError) {
                console.error('[DEBUG] Failed to find company with bigint method:', bigintLookupError);
                throw error; // Throw the original error since that's what failed first
              }
            } else if (data && Array.isArray(data) && data.length > 0) {
              // Original function worked
              const uuid = data[0].id;
              console.log('[DEBUG] Found company UUID:', uuid);
              
              // Now fetch the full company data with that UUID
              const { data: companyWithSections, error: companyError } = await supabase
                .from('companies')
                .select('*, sections(*)')
                .eq('id', uuid)
                .maybeSingle();
                
              if (companyError) {
                console.error('[DEBUG] Error fetching company details with UUID:', companyError);
                throw companyError;
              }
              
              companyData = companyWithSections;
            }
          }
          
          if (companyData) {
            console.log('[DEBUG] Company data retrieved:', companyData.name);
            
            // Extract a numeric ID from the UUID for compatibility with the rest of the app
            let numericId = 0;
            try {
              const firstPart = companyData.id.split('-')[0];
              numericId = parseInt(firstPart, 16);
              console.log('[DEBUG] Generated numeric ID from UUID:', numericId);
            } catch (err) {
              console.error('[DEBUG] Error generating numeric ID:', err);
            }
            
            const formattedCompany: CompanyDetailed = {
              id: numericId, // Using numeric ID extracted from UUID
              name: companyData.name,
              overallScore: companyData.overall_score,
              createdAt: companyData.created_at,
              updatedAt: companyData.updated_at || companyData.created_at,
              sections: Array.isArray(companyData.sections) ? companyData.sections.map((section: any) => ({
                id: section.id,
                type: section.type as any,
                title: section.title,
                score: section.score,
                description: section.description || '',
                createdAt: section.created_at,
                updatedAt: section.updated_at || section.created_at
              })) : [],
              assessmentPoints: companyData.assessment_points || [],
              perplexityResponse: companyData.perplexity_response,
              perplexityPrompt: companyData.perplexity_prompt,
              perplexityRequestedAt: companyData.perplexity_requested_at,
              reportId: companyData.report_id
            };
            
            console.log('[DEBUG] Formatted company:', formattedCompany.name, 'ID:', formattedCompany.id);
            
            setCompany(formattedCompany);
            setError(null);
            setIsLoading(false);
            return;
          } else {
            console.log('[DEBUG] No company found in Supabase, trying mock data');
          }
        } else {
          console.log('[DEBUG] No authenticated user, using mock data');
        }
        
        console.log('[DEBUG] Falling back to mock API for company details');
        
        try {
          console.log('[DEBUG] Calling API with ID:', companyId);
          // We'll convert the ID to a number if it's a string ID for the mock API
          const response = await api.getCompany(companyId);
          
          setCompany(response.data);
          setError(null);
        } catch (apiError: any) {
          console.error('[DEBUG] Failed to fetch from mock API:', apiError);
          
          const errorMessage = apiError.message === 'Company not found' 
            ? `Company with ID ${companyId} was not found in our database.`
            : 'Unable to retrieve company details. Please try again later.';
            
          throw new Error(errorMessage);
        }
      } catch (err: any) {
        console.error('[DEBUG] Failed to fetch company details:', err);
        
        const userError = new Error(
          typeof err === 'object' && err.message 
            ? err.message
            : `Unable to find company with ID ${companyId}. The company might not exist or there was a connection issue.`
        );
        
        setError(userError);
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
        console.log('[DEBUG] Fetching section details for company:', companyId, 'section:', sectionId);
        console.log('[DEBUG] Parameter types - companyId:', typeof companyId, 'sectionId:', typeof sectionId);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('[DEBUG] User authenticated, trying to fetch from Supabase. User ID:', user.id);
          
          const isNumeric = /^\d+$/.test(companyId);
          console.log('[DEBUG] Is company ID numeric?', isNumeric);
          
          let companyUuid;
          
          if (isNumeric) {
            console.log('[DEBUG] Numeric company ID detected, getting UUID first');
            console.log('[DEBUG] RPC parameter:', { numeric_id: companyId });
            
            const { data, error } = await supabase.rpc('find_company_by_numeric_id', { 
              numeric_id: companyId
            });
            
            if (error) {
              console.error('[DEBUG] Error fetching company by numeric ID:', error);
              console.error('[DEBUG] Error details:', JSON.stringify(error, null, 2));
              throw error;
            }
            
            console.log('[DEBUG] RPC result for company ID:', data);
            console.log('[DEBUG] RPC result type:', typeof data);
            console.log('[DEBUG] Is array?', Array.isArray(data));
            
            if (data && Array.isArray(data)) {
              console.log('[DEBUG] Data array length:', data.length);
              if (data.length > 0) {
                console.log('[DEBUG] First item properties:', Object.keys(data[0]));
              }
            }
            
            if (Array.isArray(data) && data.length > 0 && 'id' in data[0]) {
              companyUuid = data[0].id;
              console.log('[DEBUG] Found company UUID:', companyUuid);
            } else {
              console.error('[DEBUG] Company not found with numeric ID:', companyId);
              console.error('[DEBUG] RPC response:', data);
              throw new Error('Company not found');
            }
          } else {
            companyUuid = companyId;
            console.log('[DEBUG] Using companyId directly as UUID:', companyUuid);
          }
          
          console.log('[DEBUG] Querying section with ID:', sectionId, 'and company_id:', companyUuid);
          const { data: sectionData, error: sectionError } = await supabase
            .from('sections')
            .select('*')
            .eq('id', sectionId)
            .eq('company_id', companyUuid)
            .maybeSingle();
            
          if (sectionError) {
            console.error('[DEBUG] Error fetching section from Supabase:', sectionError);
            console.error('[DEBUG] Error details:', JSON.stringify(sectionError, null, 2));
            throw sectionError;
          }
          
          if (sectionData) {
            console.log('[DEBUG] Found section in Supabase:', sectionData.title);
            
            const { data: sectionDetails, error: detailsError } = await supabase
              .from('section_details')
              .select('*')
              .eq('section_id', sectionId);
              
            if (detailsError) {
              console.error('[DEBUG] Error fetching section details:', detailsError);
              console.error('[DEBUG] Error details:', JSON.stringify(detailsError, null, 2));
            }
            
            console.log('[DEBUG] Section details retrieved:', sectionDetails ? sectionDetails.length : 0);
            
            const strengths = sectionDetails?.filter(detail => detail.detail_type === 'strength')
              .map(strength => strength.content) || [];
            
            const weaknesses = sectionDetails?.filter(detail => detail.detail_type === 'weakness')
              .map(weakness => weakness.content) || [];
            
            const detailedContent = sectionDetails?.find(detail => detail.detail_type === 'content')?.content || '';
            
            console.log('[DEBUG] Processed section details - strengths:', strengths.length, 'weaknesses:', weaknesses.length);
            console.log('[DEBUG] Has detailed content:', !!detailedContent);
            
            const formattedSection: SectionDetailed = {
              id: sectionData.id,
              type: sectionData.type as any,
              title: sectionData.title,
              score: sectionData.score,
              description: sectionData.description || '',
              strengths: strengths,
              weaknesses: weaknesses,
              detailedContent: detailedContent,
              createdAt: sectionData.created_at,
              updatedAt: sectionData.updated_at || sectionData.created_at
            };
            
            console.log('[DEBUG] Section formatted successfully:', formattedSection.title);
            
            setSection(formattedSection);
            setIsLoading(false);
            setError(null);
            return;
          } else {
            console.log('[DEBUG] Section not found in Supabase, trying mock data');
          }
        }
        
        console.log('[DEBUG] Falling back to mock API for section details');
        
        try {
          const numericCompanyId = parseInt(companyId);
          
          if (isNaN(numericCompanyId)) {
            console.error('[DEBUG] Invalid company ID - not a number');
            throw new Error('Invalid company ID');
          }

          console.log('[DEBUG] Calling mock API with company ID:', numericCompanyId, 'and section ID:', sectionId);
          const response = await api.getSection(numericCompanyId, sectionId);
          console.log('[DEBUG] Mock API response:', response.data ? 'Data received' : 'No data');
          
          if (response.data) {
            console.log('[DEBUG] Mock section title:', response.data.title);
          }
          
          setSection(response.data);
          setError(null);
        } catch (apiError) {
          console.error('[DEBUG] Failed to fetch from mock API:', apiError);
          throw apiError;
        }
      } catch (err) {
        console.error('[DEBUG] Failed to fetch section details:', err);
        console.error('[DEBUG] Error type:', err instanceof Error ? 'Error object' : typeof err);
        console.error('[DEBUG] Error details:', err instanceof Error ? err.message : String(err));
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
