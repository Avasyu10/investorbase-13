
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { CompanyListItem, CompanyDetailed, SectionDetailed } from '@/lib/api/apiContract';
import { supabase } from '@/integrations/supabase/client';

// Original useCompanies hook
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
        
        // First try to fetch from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // If no user, use the mock API data
          console.log('No authenticated user, using mock data');
          fetchMockCompanies();
          return;
        }
        
        // Query companies from Supabase
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
          // Transform data to match CompanyListItem format
          const formattedCompanies: CompanyListItem[] = data.map(item => {
            const isFromPublicSubmission = item.report_id && !!item.user_id;
            return {
              id: parseInt(item.id.split('-')[0], 16), // Generate a numeric ID from the UUID
              name: item.name,
              overallScore: item.overall_score,
              createdAt: item.created_at,
              updatedAt: item.created_at,
              assessmentPoints: item.assessment_points || [],
              // Add a source indicator for public submissions
              source: isFromPublicSubmission ? 'public' : 'dashboard',
              // Add report ID if available
              reportId: item.report_id
            };
          });
          
          setCompanies(formattedCompanies);
          setTotalCount(count || data.length);
          setError(null);
        } else {
          // Fallback to mock data if no results from Supabase
          console.log('No companies found in Supabase, using mock data');
          fetchMockCompanies();
        }
      } catch (err) {
        console.error('Failed to fetch companies:', err);
        // Fallback to mock data on error
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
          // Paginated response
          const paginatedData = response.data.data as CompanyListItem[];
          setCompanies(paginatedData);
          // Fix: Change 'total' to the correct property or handle it conditionally
          const paginationData = response.data.pagination as { total?: number };
          setTotalCount(paginationData.total || paginatedData.length);
        } else {
          // Non-paginated response
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

// Updated useCompanyDetails hook with enhanced logging
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
        
        // First try to fetch from Supabase if authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('[DEBUG] User authenticated, trying to fetch from Supabase. User ID:', user.id);
          
          // Check if companyId is numeric or UUID
          const isNumeric = /^\d+$/.test(companyId);
          console.log('[DEBUG] Is company ID numeric?', isNumeric);
          
          let companyData;
          
          if (isNumeric) {
            console.log('[DEBUG] Numeric ID detected, fetching by numeric ID using find_company_by_numeric_id function');
            console.log('[DEBUG] Calling RPC with parameter:', { numeric_id: companyId });
            
            // The function expects a text parameter, so we pass the companyId as is
            const { data, error } = await supabase.rpc('find_company_by_numeric_id', { 
              numeric_id: companyId  // Pass directly as text parameter
            });
            
            if (error) {
              console.error('[DEBUG] Error fetching company by numeric ID:', error);
              console.error('[DEBUG] Error details:', JSON.stringify(error, null, 2));
              throw error;
            }
            
            console.log('[DEBUG] RPC function returned data:', data);
            console.log('[DEBUG] RPC data type:', typeof data);
            console.log('[DEBUG] RPC is array?', Array.isArray(data));
            
            if (data && Array.isArray(data)) {
              console.log('[DEBUG] Data array length:', data.length);
            }
            
            // Check if data is an array and has the expected structure
            if (Array.isArray(data) && data.length > 0 && 'id' in data[0]) {
              // Get the actual company UUID from the result
              const companyUuid = data[0].id;
              console.log('[DEBUG] Found company UUID:', companyUuid);
              
              // Now fetch the full company details with the UUID
              console.log('[DEBUG] Fetching full company details with UUID:', companyUuid);
              const { data: fullCompanyData, error: fullDataError } = await supabase
                .from('companies')
                .select('*, sections(*)')
                .eq('id', companyUuid)
                .maybeSingle();
                
              if (fullDataError) {
                console.error('[DEBUG] Error fetching full company details:', fullDataError);
                console.error('[DEBUG] Full error details:', JSON.stringify(fullDataError, null, 2));
                throw fullDataError;
              }
              
              companyData = fullCompanyData;
              console.log('[DEBUG] Full company data retrieved:', companyData ? 'Yes' : 'No');
              if (companyData) {
                console.log('[DEBUG] Company name:', companyData.name);
                console.log('[DEBUG] Has sections?', companyData.sections && companyData.sections.length > 0);
              }
            } else {
              console.log('[DEBUG] No company found with numeric ID, or invalid response format:', data);
              companyData = null;
            }
          } else {
            // Fetch by UUID directly
            console.log('[DEBUG] UUID detected, fetching directly with:', companyId);
            const { data, error } = await supabase
              .from('companies')
              .select('*, sections(*)')
              .eq('id', companyId)
              .maybeSingle();
              
            if (error) {
              console.error('[DEBUG] Error fetching company by UUID:', error);
              console.error('[DEBUG] Error details:', JSON.stringify(error, null, 2));
              throw error;
            }
            
            companyData = data;
            console.log('[DEBUG] Company data by UUID:', companyData ? 'Found' : 'Not found');
          }
          
          if (companyData) {
            console.log('[DEBUG] Formatting company data to match CompanyDetailed structure');
            // Format company data to match CompanyDetailed structure
            const formattedCompany: CompanyDetailed = {
              id: parseInt(companyData.id.split('-')[0], 16),
              name: companyData.name,
              overallScore: companyData.overall_score,
              createdAt: companyData.created_at,
              updatedAt: companyData.updated_at || companyData.created_at,
              sections: (companyData.sections || []).map((section: any) => ({
                id: section.id,
                type: section.type as any,
                title: section.title,
                score: section.score,
                description: section.description,
                createdAt: section.created_at,
                updatedAt: section.updated_at || section.created_at
              })),
              assessmentPoints: companyData.assessment_points || [],
              perplexityResponse: companyData.perplexity_response,
              perplexityPrompt: companyData.perplexity_prompt,
              perplexityRequestedAt: companyData.perplexity_requested_at,
              reportId: companyData.report_id
            };
            
            console.log('[DEBUG] Formatted company:', { 
              id: formattedCompany.id, 
              name: formattedCompany.name,
              sections: formattedCompany.sections?.length
            });
            
            setCompany(formattedCompany);
            setError(null);
            setIsLoading(false);
            return;
          } else {
            console.log('[DEBUG] No company found in Supabase, trying mock data for ID:', companyId);
          }
        } else {
          console.log('[DEBUG] No authenticated user, using mock data');
        }
        
        // Fall back to mock API if no Supabase data or not authenticated
        console.log('[DEBUG] Falling back to mock API for company details');
        
        try {
          // Convert string to number before passing to API
          console.log('[DEBUG] Converting companyId to number:', companyId);
          const numericId = parseInt(companyId);
          
          if (isNaN(numericId)) {
            console.error('[DEBUG] Invalid company ID - not a number');
            throw new Error('Invalid company ID');
          }

          console.log('[DEBUG] Calling mock API with numeric ID:', numericId);
          const response = await api.getCompany(numericId);
          console.log('[DEBUG] Mock API response:', response.data ? 'Data received' : 'No data');
          
          if (response.data) {
            console.log('[DEBUG] Mock company name:', response.data.name);
          }
          
          setCompany(response.data);
          setError(null);
        } catch (apiError) {
          console.error('[DEBUG] Failed to fetch from mock API:', apiError);
          throw apiError;
        }
      } catch (err) {
        console.error('[DEBUG] Failed to fetch company details:', err);
        console.error('[DEBUG] Error type:', err instanceof Error ? 'Error object' : typeof err);
        console.error('[DEBUG] Error details:', err instanceof Error ? err.message : String(err));
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

// Updated useSectionDetails hook with enhanced logging
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
        
        // First try to fetch from Supabase if authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('[DEBUG] User authenticated, trying to fetch from Supabase. User ID:', user.id);
          
          // Check if companyId is numeric or UUID
          const isNumeric = /^\d+$/.test(companyId);
          console.log('[DEBUG] Is company ID numeric?', isNumeric);
          
          let companyUuid;
          
          if (isNumeric) {
            console.log('[DEBUG] Numeric company ID detected, getting UUID first');
            console.log('[DEBUG] RPC parameter:', { numeric_id: companyId });
            
            // Pass companyId directly as text parameter
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
            
            // Check if data is an array and has the expected structure
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
          
          // Query section details
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
            
            // Fetch section details for strengths, weaknesses, and detailed content
            console.log('[DEBUG] Fetching section details for section ID:', sectionId);
            const { data: sectionDetails, error: detailsError } = await supabase
              .from('section_details')
              .select('*')
              .eq('section_id', sectionId);
              
            if (detailsError) {
              console.error('[DEBUG] Error fetching section details:', detailsError);
              console.error('[DEBUG] Error details:', JSON.stringify(detailsError, null, 2));
            }
            
            console.log('[DEBUG] Section details retrieved:', sectionDetails ? sectionDetails.length : 0);
            
            // Process section details
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
        
        // Fall back to mock API if no Supabase data or not authenticated
        console.log('[DEBUG] Falling back to mock API for section details');
        
        try {
          // Convert string to number before passing to API
          console.log('[DEBUG] Converting companyId to number:', companyId);
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
