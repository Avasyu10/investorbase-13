
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Company } from '@/lib/api/apiContract';

// Type for the analysis result structure
interface AnalysisResult {
  companyInfo?: {
    website?: string;
    stage?: string;
    industry?: string;
    description?: string;
    company_description?: string;
  };
  company_info?: {
    website?: string;
    stage?: string;
    industry?: string;
    description?: string;
    company_description?: string;
  };
  sections?: Array<{
    type?: string;
    title?: string;
    companyInfo?: {
      website?: string;
      stage?: string;
      industry?: string;
      description?: string;
      company_description?: string;
    };
  }>;
  website?: string;
  stage?: string;
  industry?: string;
  description?: string;
  company_description?: string;
  [key: string]: any;
}

export function useCompanyDetails(companyId: string) {
  const {
    data: company,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['company-details', companyId],
    queryFn: async (): Promise<Company | null> => {
      if (!companyId) return null;
      
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to view company details',
          variant: 'destructive',
        });
        return null;
      }
      
      // Get the company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (companyError) throw companyError;
      if (!companyData) return null;
      
      console.log("Retrieved company data:", companyData);
      
      // Get the sections for this company
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('company_id', companyId);
        
      if (sectionsError) throw sectionsError;
      
      console.log("Retrieved sections data:", sectionsData);
      
      // Get section details (strengths and weaknesses) for all sections
      const sectionIds = sectionsData.map(section => section.id);
      let sectionDetailsData = [];
      
      if (sectionIds.length > 0) {
        const { data: detailsData, error: detailsError } = await supabase
          .from('section_details')
          .select('*')
          .in('section_id', sectionIds);
          
        if (detailsError) {
          console.error('Error fetching section details:', detailsError);
        } else {
          sectionDetailsData = detailsData || [];
        }
      }
      
      console.log("Retrieved section details data:", sectionDetailsData);
      
      // Get company details if available
      const { data: companyDetailsData, error: companyDetailsError } = await supabase
        .from('company_details')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
        
      if (companyDetailsError) {
        console.error('Error fetching company details:', companyDetailsError);
      }
      
      console.log("Retrieved company details data:", companyDetailsData);

      // Get report data to extract company info from analysis_result
      let reportAnalysisData: AnalysisResult | null = null;
      let analysisCompanyInfo: {
        website?: string;
        stage?: string;
        industry?: string;
        description?: string;
      } = {};
      
      if (companyData.report_id) {
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('analysis_result')
          .eq('id', companyData.report_id)
          .maybeSingle();
          
        if (!reportError && reportData?.analysis_result) {
          reportAnalysisData = reportData.analysis_result as AnalysisResult;
          console.log("Retrieved analysis result:", reportAnalysisData);
          
          // Extract company info from multiple possible locations in analysis result
          if (reportAnalysisData.companyInfo) {
            analysisCompanyInfo = reportAnalysisData.companyInfo;
            console.log("Found companyInfo in analysis result:", analysisCompanyInfo);
          } else if (reportAnalysisData.company_info) {
            analysisCompanyInfo = reportAnalysisData.company_info;
            console.log("Found company_info in analysis result:", analysisCompanyInfo);
          } else if (reportAnalysisData.sections) {
            // Sometimes company info might be in the first section or a company overview section
            const companySection = reportAnalysisData.sections.find((section: any) => 
              section.type === 'COMPANY_OVERVIEW' || 
              section.title?.toLowerCase().includes('company') ||
              section.title?.toLowerCase().includes('overview')
            );
            
            if (companySection && companySection.companyInfo) {
              analysisCompanyInfo = companySection.companyInfo;
              console.log("Found company info in section:", analysisCompanyInfo);
            }
          }
          
          // Also check root level of analysis result for common fields
          if (!analysisCompanyInfo.website && reportAnalysisData.website) {
            analysisCompanyInfo.website = reportAnalysisData.website;
          }
          if (!analysisCompanyInfo.stage && reportAnalysisData.stage) {
            analysisCompanyInfo.stage = reportAnalysisData.stage;
          }
          if (!analysisCompanyInfo.industry && reportAnalysisData.industry) {
            analysisCompanyInfo.industry = reportAnalysisData.industry;
          }
          if (!analysisCompanyInfo.description && reportAnalysisData.description) {
            analysisCompanyInfo.description = reportAnalysisData.description;
          }
          if (!analysisCompanyInfo.description && reportAnalysisData.company_description) {
            analysisCompanyInfo.description = reportAnalysisData.company_description;
          }
          
          console.log("Final extracted company info:", analysisCompanyInfo);
        } else {
          console.log("No analysis result found or error:", reportError);
        }
      }
      
      // Map sections with their details
      const sectionsWithDetails = sectionsData.map(section => {
        const sectionDetails = sectionDetailsData.filter(detail => detail.section_id === section.id);
        
        const strengths = sectionDetails
          .filter(detail => detail.detail_type === 'strength')
          .map(detail => detail.content);
          
        const weaknesses = sectionDetails
          .filter(detail => detail.detail_type === 'weakness')
          .map(detail => detail.content);
        
        return {
          id: section.id,
          type: section.type,
          title: section.title,
          score: Number(section.score),
          description: section.description || 'No detailed content available.',
          strengths,
          weaknesses,
          created_at: section.created_at,
          updated_at: section.updated_at || section.created_at,
        };
      });
      
      console.log("Mapped sections with details:", sectionsWithDetails);

      // Prioritize company info from analysis result, then from company_details table, then fallbacks
      const finalCompanyInfo = {
        website: analysisCompanyInfo.website || companyDetailsData?.website || '',
        stage: analysisCompanyInfo.stage || companyDetailsData?.stage || '',
        industry: analysisCompanyInfo.industry || companyDetailsData?.industry || companyData.industry || '',
        introduction: analysisCompanyInfo.description || companyDetailsData?.introduction || '',
      };
      
      console.log("Final company info to be used:", finalCompanyInfo);
      
      return {
        id: companyData.id,
        name: companyData.name,
        overall_score: Number(companyData.overall_score),
        assessment_points: companyData.assessment_points || [],
        sections: sectionsWithDetails,
        created_at: companyData.created_at,
        updated_at: companyData.updated_at,
        source: companyData.source,
        report_id: companyData.report_id,
        // Use the prioritized company info
        website: finalCompanyInfo.website,
        stage: finalCompanyInfo.stage,
        industry: finalCompanyInfo.industry,
        introduction: finalCompanyInfo.introduction,
      };
    },
    enabled: !!companyId,
    staleTime: 30000, // Consider data fresh for 30 seconds
    meta: {
      onError: (err: any) => {
        toast({
          title: 'Error loading company details',
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
