
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Company } from '@/lib/api/apiContract';

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
      let reportAnalysisData = null;
      if (companyData.report_id) {
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('analysis_result')
          .eq('id', companyData.report_id)
          .maybeSingle();
          
        if (!reportError && reportData?.analysis_result) {
          reportAnalysisData = reportData.analysis_result;
          console.log("Retrieved analysis result company info:", reportAnalysisData.companyInfo);
        }
      }
      
      // Parse response_received JSON if it exists
      let responseReceivedData = null;
      if (companyData.response_received) {
        try {
          responseReceivedData = JSON.parse(companyData.response_received);
          console.log("Parsed response_received data:", responseReceivedData);
        } catch (error) {
          console.error('Error parsing response_received JSON:', error);
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
          company_id: section.company_id,
          section_type: section.section_type,
        };
      });
      
      console.log("Mapped sections with details:", sectionsWithDetails);

      // Prioritize data sources: response_received, then analysis result, then company_details table
      const analysisCompanyInfo = reportAnalysisData?.companyInfo || {};
      
      return {
        id: companyData.id,
        name: companyData.name,
        overall_score: Number(companyData.overall_score),
        created_at: companyData.created_at,
        updated_at: companyData.updated_at,
        assessment_points: companyData.assessment_points || [],
        report_id: companyData.report_id,
        source: companyData.source,
        scoring_reason: companyData.scoring_reason,
        poc_name: companyData.poc_name,
        phonenumber: companyData.phonenumber,
        email: companyData.email,
        industry: responseReceivedData?.industry || analysisCompanyInfo.industry || companyDetailsData?.industry || companyData.industry,
        response_received: companyData.response_received,
        deck_url: companyData.deck_url,
        website: responseReceivedData?.website || analysisCompanyInfo.website || companyDetailsData?.website,
        stage: responseReceivedData?.stage || analysisCompanyInfo.stage || companyDetailsData?.stage,
        introduction: responseReceivedData?.introduction || analysisCompanyInfo.introduction || companyDetailsData?.introduction,
        sections: sectionsWithDetails,
        reportId: companyData.report_id, // For backward compatibility
      };
    },
    enabled: !!companyId,
    meta: {
      onError: (err: any) => {
        console.error("useCompanyDetails query error:", err);
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
