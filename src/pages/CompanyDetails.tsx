
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard } from "@/components/companies/SectionCard";
import { ScoreAssessment } from "@/components/companies/ScoreAssessment";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { SlideBySlideViewer } from "@/components/companies/SlideBySlideViewer";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Loader2, BarChart2, BookOpen } from "lucide-react";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { OverallAssessment } from "@/components/companies/OverallAssessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailed } from "@/lib/api/apiContract";
import { supabase } from "@/integrations/supabase/client";

interface SlideNote {
  slideNumber: number;
  notes: string[];
}

interface AnalysisResult {
  slideBySlideNotes?: SlideNote[];
  [key: string]: any;
}

function CompanyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, user } = useAuth();
  const { company, isLoading } = useCompanyDetails(id || "");
  const [error, setError] = useState<string | null>(null);
  const [isIITBombayUser, setIsIITBombayUser] = useState(false);
  const [slideNotes, setSlideNotes] = useState<SlideNote[]>([]);

  // Convert Company to CompanyDetailed for components that need it
  const companyDetailed: CompanyDetailed | null = company ? {
    ...company,
    sections: company.sections || []
  } : null;

  // Check if current user is IIT Bombay user
  useEffect(() => {
    const checkUserType = async () => {
      if (!user) return;
      
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('is_iitbombay')
          .eq('id', user.id)
          .single();
        
        setIsIITBombayUser(userProfile?.is_iitbombay || false);
      } catch (error) {
        console.error('Error checking user type:', error);
      }
    };

    checkUserType();
  }, [user]);

  // Extract slide notes from company data
  useEffect(() => {
    if (company?.report_id) {
      // Get slide notes from the report analysis result
      const fetchSlideNotes = async () => {
        try {
          const { data: report } = await supabase
            .from('reports')
            .select('analysis_result')
            .eq('id', company.report_id)
            .single();
          
          if (report?.analysis_result) {
            const analysisResult = report.analysis_result as AnalysisResult;
            if (analysisResult.slideBySlideNotes) {
              setSlideNotes(analysisResult.slideBySlideNotes);
            }
          }
        } catch (error) {
          console.error('Error fetching slide notes:', error);
        }
      };
      
      fetchSlideNotes();
    }
  }, [company?.report_id]);

  useEffect(() => {
    if (!company && !isLoading) {
      setError("Company not found");
    }
  }, [company, isLoading]);

  // Filter sections based on user type
  const filteredSections = company?.sections ? 
    company.sections.filter(section => {
      if (isIITBombayUser) {
        // IIT Bombay users: exclude slide notes
        return section.type !== 'SLIDE_NOTES';
      } else {
        // Non-IIT Bombay users: exclude regular sections, only show slide notes
        return section.type === 'SLIDE_NOTES';
      }
    }) : [];

  // Early return for loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Early return for error state
  if (error || !company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Company Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The company you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Ensure we have values to display, using empty strings if properties are undefined
  const websiteToShow = company.website || "";
  const stageToShow = company.stage || "";
  const industryToShow = company.industry || "";
  const introductionToShow = company.introduction || "";

  return (
    <div className="h-screen flex flex-col">
      <ScrollArea className="flex-1">
        <div className="container mx-auto px-4 pt-0 pb-6 animate-fade-in">
          {/* Back Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="mb-6 flex items-center"
          >
            <ChevronLeft className="mr-1" /> Back
          </Button>

          {/* Combined Company Overview and Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <CompanyInfoCard
                website={websiteToShow}
                stage={stageToShow}
                industry={industryToShow}
                introduction={introductionToShow}
                companyName={company.name}
              />
            </div>
            <div>
              {/* Only show ScoreAssessment for IIT Bombay users */}
              {isIITBombayUser && companyDetailed && <ScoreAssessment company={companyDetailed} />}
            </div>
          </div>

          {/* Only show Overall Assessment for IIT Bombay users */}
          {isIITBombayUser && (
            <OverallAssessment
              score={company.overall_score || 0}
              assessmentPoints={company.assessment_points || []}
            />
          )}

          {/* Sections based on user type */}
          {!isIITBombayUser ? (
            // Non-IIT Bombay users: Show slide-by-slide notes viewer
            <>
              {slideNotes.length > 0 && company.report_id ? (
                <SlideBySlideViewer
                  reportId={company.report_id}
                  slideNotes={slideNotes}
                  companyName={company.name}
                />
              ) : (
                <>
                  <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Slide by Slide Notes
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredSections.length > 0 ? (
                      filteredSections.map((section) => (
                        <SectionCard
                          key={section.id}
                          section={section}
                          onClick={() => navigate(`/company/${company.id}/section/${section.id}`)}
                        />
                      ))
                    ) : (
                      <Card className="col-span-full">
                        <CardHeader>
                          <CardTitle>No Slide Notes Available</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">
                            There are no slide-by-slide notes available for this company.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            // IIT Bombay users: Show detailed analysis sections
            <>
              <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                Detailed Analysis
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSections.length > 0 ? (
                  filteredSections.map((section) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      onClick={() => navigate(`/company/${company.id}/section/${section.id}`)}
                    />
                  ))
                ) : (
                  <Card className="col-span-full">
                    <CardHeader>
                      <CardTitle>No Analysis Sections Available</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        There are no detailed analysis sections available for this company.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default CompanyDetails;
