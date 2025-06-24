import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard } from "@/components/companies/SectionCard";
import { SectionChecklist } from "@/components/companies/SectionChecklist";
import { ScoreAssessment } from "@/components/companies/ScoreAssessment";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { SlideBySlideViewer } from "@/components/companies/SlideBySlideViewer";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Loader2, BarChart2, ListChecks } from "lucide-react";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { OverallAssessment } from "@/components/companies/OverallAssessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailed } from "@/lib/api/apiContract";
import { supabase } from "@/integrations/supabase/client";
import { ImprovementSuggestions } from "@/components/companies/ImprovementSuggestions";

interface SlideNote {
  slideNumber: number;
  notes: string[];
}

interface AnalysisResult {
  slideBySlideNotes?: SlideNote[];
  improvementSuggestions?: string[];
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
  const [improvementSuggestions, setImprovementSuggestions] = useState<string[]>([]);

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
        console.log('User type checked:', { 
          userId: user.id, 
          isIITBombay: userProfile?.is_iitbombay || false 
        });
      } catch (error) {
        console.error('Error checking user type:', error);
      }
    };

    checkUserType();
  }, [user]);

  // Extract slide notes and improvement suggestions from company data
  useEffect(() => {
    if (company?.report_id) {
      console.log('Fetching slide notes and improvement suggestions for report_id:', company.report_id);
      
      // Get slide notes and improvement suggestions from the report analysis result
      const fetchAnalysisData = async () => {
        try {
          const { data: report } = await supabase
            .from('reports')
            .select('analysis_result')
            .eq('id', company.report_id)
            .single();
          
          console.log('Report data fetched:', report);
          
          if (report?.analysis_result) {
            const analysisResult = report.analysis_result as AnalysisResult;
            console.log('Full analysis result:', analysisResult);
            
            // Set slide notes
            if (analysisResult.slideBySlideNotes && analysisResult.slideBySlideNotes.length > 0) {
              setSlideNotes(analysisResult.slideBySlideNotes);
              console.log('Slide notes found:', analysisResult.slideBySlideNotes.length);
            } else {
              console.log('No slideBySlideNotes in analysis result or empty array');
              setSlideNotes([]);
            }
            
            // Set improvement suggestions - check multiple possible locations
            let suggestions: string[] = [];
            
            if (analysisResult.improvementSuggestions && Array.isArray(analysisResult.improvementSuggestions)) {
              suggestions = analysisResult.improvementSuggestions;
              console.log('Found improvementSuggestions in root:', suggestions.length);
            } else if (analysisResult.sections) {
              // Sometimes improvement suggestions might be nested in sections
              console.log('Checking sections for improvement suggestions');
              for (const section of analysisResult.sections) {
                if (section.improvementSuggestions && Array.isArray(section.improvementSuggestions)) {
                  suggestions = [...suggestions, ...section.improvementSuggestions];
                }
              }
              console.log('Found suggestions in sections:', suggestions.length);
            }
            
            // Always show improvement suggestions section, even if empty (for debugging)
            setImprovementSuggestions(suggestions);
            console.log('Final improvement suggestions count:', suggestions.length);
            console.log('Improvement suggestions:', suggestions);
          } else {
            console.log('No analysis_result in report');
            setSlideNotes([]);
            setImprovementSuggestions([]);
          }
        } catch (error) {
          console.error('Error fetching analysis data:', error);
          setSlideNotes([]);
          setImprovementSuggestions([]);
        }
      };
      
      fetchAnalysisData();
    } else {
      console.log('No report_id found for company');
      setSlideNotes([]);
      setImprovementSuggestions([]);
    }
  }, [company?.report_id]);

  useEffect(() => {
    if (!company && !isLoading) {
      setError("Company not found");
    }
  }, [company, isLoading]);

  // Debug logging for the rendering decision
  useEffect(() => {
    if (company) {
      console.log('Company details debug info:', {
        companyName: company.name,
        reportId: company.report_id,
        isIITBombayUser,
        slideNotesCount: slideNotes.length,
        improvementSuggestionsCount: improvementSuggestions.length,
        shouldShowSlideViewer: company.report_id ? true : false,
        shouldShowImprovementSuggestions: company.report_id ? true : false
      });
    }
  }, [company, isIITBombayUser, slideNotes, improvementSuggestions]);

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

  // Filter sections based on user type - exclude slide notes for regular section display
  const filteredSections = company?.sections ? 
    company.sections.filter(section => section.type !== 'SLIDE_NOTES') : [];

  console.log('Filtered sections (excluding SLIDE_NOTES):', filteredSections);
  console.log('Should show slide viewer:', !!company.report_id);
  console.log('Should show improvement suggestions:', !!company.report_id);

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 pt-0 pb-6 animate-fade-in">
        {/* Back Button */}
        <div className="container mx-auto mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="flex items-center"
          >
            <ChevronLeft className="mr-1" /> Back
          </Button>
        </div>

        {/* Company Overview - Full width like IIT Bombay version */}
        <div className="w-full mb-8">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-4">
                <CompanyInfoCard
                  website={websiteToShow}
                  stage={stageToShow}
                  industry={industryToShow}
                  introduction={introductionToShow}
                  companyName={company.name}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto">
          {/* Only show Overall Assessment for IIT Bombay users */}
          {isIITBombayUser && (
            <OverallAssessment
              score={company.overall_score || 0}
              assessmentPoints={company.assessment_points || []}
            />
          )}

          {/* ALWAYS show slide-by-slide section when report_id exists - MOVED ABOVE section metrics */}
          {company.report_id && (
            <SlideBySlideViewer
              reportId={company.report_id}
              slideNotes={slideNotes}
              companyName={company.name}
            />
          )}

          {/* Show section metrics for IIT Bombay users */}
          {isIITBombayUser && (
            <>
              <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                Section Metrics
              </h2>
              
              {filteredSections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {filteredSections.map((section) => (
                    <SectionCard 
                      key={section.id} 
                      section={section} 
                      onClick={() => navigate(`/company/${company.id}/section/${section.id}`)} 
                    />
                  ))}
                </div>
              ) : (
                <Card className="mb-8">
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
            </>
          )}

          {/* Show section checklist for non-IIT Bombay users */}
          {!isIITBombayUser && filteredSections.length > 0 && (
            <>  
              <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Section Analysis Checklist
              </h2>
              
              <div className="mb-8">
                <SectionChecklist 
                  sections={filteredSections}
                />
              </div>
            </>
          )}

          {/* ALWAYS show Improvement Suggestions section when report_id exists */}
          {company.report_id && (
            <ImprovementSuggestions
              suggestions={improvementSuggestions}
              companyName={company.name}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CompanyDetails;
