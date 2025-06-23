
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { ReportSegment } from "./ReportSegment";
import { NonIITBombayReportViewer } from "./NonIITBombayReportViewer";

interface ReportViewerProps {
  reportId: string;
}

export const ReportViewer = ({ reportId }: ReportViewerProps) => {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      // First, get the report data including analysis_result
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select(`
          *,
          analysis_result
        `)
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      // Get the profile data separately
      let profileData = null;
      if (reportData?.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_iitbombay')
          .eq('id', reportData.user_id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else {
          profileData = profile;
        }
      }

      // If there's a company_id, get the company data separately
      let companyData = null;
      if (reportData?.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select(`
            *,
            sections (
              id,
              title,
              description,
              score,
              section_type,
              section_details (
                id,
                detail_type,
                content
              )
            )
          `)
          .eq('id', reportData.company_id)
          .single();

        if (companyError) {
          console.error('Error fetching company:', companyError);
        } else {
          companyData = company;
        }
      }

      return {
        ...reportData,
        profiles: profileData,
        companies: companyData
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading report: {error.message}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Report not found</p>
      </div>
    );
  }

  // Check if this is a non-IIT Bombay user with new format
  const isIITBombayUser = report.profiles?.is_iitbombay || false;
  const hasNewFormat = report.analysis_result?.companyOverview && report.analysis_result?.slideBySlideNotes;

  if (!isIITBombayUser && hasNewFormat) {
    // Render new format for non-IIT Bombay users
    return (
      <NonIITBombayReportViewer 
        analysisResult={report.analysis_result}
        pdfUrl={report.pdf_url}
      />
    );
  }

  // Render traditional format for IIT Bombay users or legacy reports
  const company = report.companies;
  
  if (!company) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No company data available for this report</p>
      </div>
    );
  }

  const sections = company.sections || [];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{company.name}</h1>
        <div className="text-xl font-semibold text-primary">
          Overall Score: {company.overall_score}/100
        </div>
      </div>

      {company.assessment_points && company.assessment_points.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Key Assessment Points</h2>
          <div className="space-y-2">
            {company.assessment_points.map((point: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-muted-foreground">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {sections.map((section: any) => (
          <ReportSegment
            key={section.id}
            sectionTitle={section.title}
            score={section.score}
            description={section.description}
            sectionDetails={section.section_details || []}
            sectionType={section.section_type}
          />
        ))}
      </div>
    </div>
  );
};
