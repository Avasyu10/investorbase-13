import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SectionCard } from "@/components/companies/SectionCard";
import { SectionChecklist } from "@/components/companies/SectionChecklist";
import { OverallAssessment } from "@/components/companies/OverallAssessment";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { ImprovementSuggestions } from "@/components/companies/ImprovementSuggestions";
import { SlideBySlideViewer } from "@/components/companies/SlideBySlideViewer";
import { QuestionsToAsk } from "@/components/companies/QuestionsToAsk";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, BarChart2, ListChecks, Lightbulb, FileText, Globe, Newspaper, TrendingUp, ExternalLink } from "lucide-react";
import { useCompanyDetails } from "@/hooks/companyHooks/useCompanyDetails";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailed } from "@/lib/api/apiContract";
import { supabase } from "@/integrations/supabase/client";
import { MarketResearch } from "@/components/companies/MarketResearch";
import { MarketResearchDisplay } from "@/components/companies/MarketResearchDisplay";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface SlideNote {
  slideNumber: number;
  notes: string[];
}

interface AnalysisResult {
  slideBySlideNotes?: SlideNote[];
  improvementSuggestions?: string[];
  sections?: Array<{
    title: string;
    type: string;
    status?: string;
    score?: number;
    description?: string;
    strengths?: string[];
    weaknesses?: string[];
    improvementSuggestions?: string[];
  }>;
  [key: string]: any;
}

function CompanyDetails() {
  const { id } = useParams<{ id: string; }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, user } = useAuth();
  const { profile, isLoading: profileLoading, isVCAndBits, isBitsQuestion } = useProfile();
  const { company, isLoading } = useCompanyDetails(id || "");
  const [error, setError] = useState<string | null>(null);
  const [slideNotes, setSlideNotes] = useState<SlideNote[]>([]);
  const [improvementSuggestions, setImprovementSuggestions] = useState<string[]>([]);
  const [sectionsWithStatus, setSectionsWithStatus] = useState<any[]>([]);
  const queryClient = useQueryClient();

  // Convert Company to CompanyDetailed for components that need it
  const companyDetailed: CompanyDetailed | null = company ? {
    ...company,
    sections: company.sections || []
  } : null;

  // Determine user type based on profile - using correct property names
  const isVCUser = profile?.is_vc || profile?.is_eximius || false;
  const isIITBombayUser = profile?.is_iitbombay || false;
  const isRegularUser = !isVCUser && !isIITBombayUser && !isBitsQuestion;

  // Ensure we have values to display, using fallbacks and proper defaults - moved before usage
  const websiteToShow = company?.website || "";
  const stageToShow = company?.stage || "Not specified";
  const industryToShow = company?.industry || "Not specified";
  const introductionToShow = company?.introduction || `${company?.name || 'This company'} is a company in our portfolio. Detailed information about their business model, market opportunity, and growth strategy is available through their pitch deck analysis.`;

  // Extract slide notes, improvement suggestions, and section statuses from company data
  useEffect(() => {
    if (company?.report_id) {
      console.log('Fetching analysis data for report_id:', company.report_id);

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

            // Set improvement suggestions - fix the property access
            let suggestions: string[] = [];
            if (analysisResult.improvementSuggestions && Array.isArray(analysisResult.improvementSuggestions)) {
              suggestions = analysisResult.improvementSuggestions;
              console.log('Found improvementSuggestions in root:', suggestions.length);
            } else if (analysisResult.sections) {
              console.log('Checking sections for improvement suggestions');
              for (const section of analysisResult.sections) {
                if (section.improvementSuggestions && Array.isArray(section.improvementSuggestions)) {
                  suggestions = [...suggestions, ...section.improvementSuggestions];
                }
              }
              console.log('Found suggestions in sections:', suggestions.length);
            }
            setImprovementSuggestions(suggestions);

            // Merge sections from database with statuses from analysis result
            if (company.sections && analysisResult.sections) {
              console.log('Merging section statuses from analysis result');
              const mergedSections = company.sections.map(dbSection => {
                // Find matching section in analysis result by title or type
                const analysisSection = analysisResult.sections?.find(
                  (analysisSection: any) => 
                    analysisSection.title === dbSection.title || 
                    analysisSection.type === dbSection.type
                );
                
                console.log(`Section ${dbSection.title}: status from analysis = ${analysisSection?.status}`);
                
                return {
                  ...dbSection,
                  status: analysisSection?.status || 'Not Addressed'
                };
              });
              
              setSectionsWithStatus(mergedSections);
              console.log('Merged sections with status:', mergedSections);
            } else {
              console.log('Using original sections without status merge');
              setSectionsWithStatus(company.sections || []);
            }
          } else {
            console.log('No analysis_result in report');
            setSlideNotes([]);
            setImprovementSuggestions([]);
            setSectionsWithStatus(company.sections || []);
          }
        } catch (error) {
          console.error('Error fetching analysis data:', error);
          setSlideNotes([]);
          setImprovementSuggestions([]);
          setSectionsWithStatus(company.sections || []);
        }
      };
      
      fetchAnalysisData();
    } else {
      console.log('No report_id found for company');
      setSlideNotes([]);
      setImprovementSuggestions([]);
      setSectionsWithStatus(company?.sections || []);
    }
  }, [company?.report_id, company?.sections]);

  // Early return for loading state
  if (authLoading || isLoading || profileLoading) {
    return <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }

  // Early return for error state
  if (error || !company) {
    return <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Company Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The company you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
        </div>
      </div>;
  }

  // For BITS question users, show only the Questions to Ask section with enhanced UI
  if (isBitsQuestion) {
    return <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="mb-6 flex items-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Dashboard
            </Button>
          </div>

          <div className="mb-8">
            <QuestionsToAsk companyId={company.id} companyName={company.name} />
          </div>
        </div>
      </div>;
  }

  // Filter sections based on user type - exclude slide notes and GTM strategy for display in section cards
  const filteredSections = sectionsWithStatus ? sectionsWithStatus.filter(section => section.type !== 'SLIDE_NOTES' && section.type !== 'GTM_STRATEGY') : [];

  // Custom sorting for VC users with specific order
  const getSortedSections = () => {
    if (!filteredSections.length) return [];

    // Special order for VC & BITS users
    if (isVCAndBits) {
      const vcAndBitsSectionOrder = [
        'PROBLEM',      // Problem Clarity & Founder Insight
        'TEAM',         // Founder Capability & Market Fit  
        'MARKET',       // Market Opportunity & Entry Strategy
        'TRACTION',     // Early Proof or Demand Signals
        'COMPETITIVE_LANDSCAPE' // Differentiation & Competitive Edge
      ];
      
      return [...filteredSections].sort((a, b) => {
        const indexA = vcAndBitsSectionOrder.indexOf(a.type);
        const indexB = vcAndBitsSectionOrder.indexOf(b.type);

        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }

        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        return 0;
      });
    }

    // Define the custom order for regular VC section display
    const vcSectionOrder = ['PROBLEM', 'MARKET', 'SOLUTION', 'TRACTION', 'COMPETITIVE_LANDSCAPE', 'BUSINESS_MODEL', 'TEAM', 'FINANCIALS', 'ASK'];
    return [...filteredSections].sort((a, b) => {
      const indexA = vcSectionOrder.indexOf(a.type);
      const indexB = vcSectionOrder.indexOf(b.type);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return 0;
    });
  };
  
  const sortedSections = getSortedSections();
  console.log('User types:', { isVCUser, isIITBombayUser, isRegularUser, isVCAndBits, isBitsQuestion });
  console.log('Filtered sections (excluding SLIDE_NOTES and GTM_STRATEGY):', filteredSections);
  console.log('Should show slide viewer:', !!company.report_id);

  // Always use 100-point scale for display
  const displayScore = company.overall_score > 5 ? company.overall_score : company.overall_score * 20;
  
  return <div className="min-h-screen">
      <div className="w-full px-4 pt-0 pb-6 animate-fade-in">
        {/* Back Button */}
        <div className="container mx-auto mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="flex items-center">
            <ChevronLeft className="mr-1" /> Back
          </Button>
        </div>

        {/* Company Overview - Full width */}
        <div className="w-full mb-8">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-4">
                <CompanyInfoCard website={websiteToShow} stage={stageToShow} industry={industryToShow} introduction={introductionToShow} companyName={company.name} />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto">
          {/* For VC users, show Overall Assessment */}
          {isVCUser && <OverallAssessment score={displayScore} assessmentPoints={company.assessment_points || []} companyId={company.id} companyName={company.name} />}

          {/* For VC users, show Real-time Market Analysis */}
          {isVCUser && company.id && <MarketResearch companyId={company.id} assessmentPoints={company.assessment_points || []} />}

          {/* Real-Time Market Research Section for VC users */}
          {isVCUser && company.id && (
            <div className="mt-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-[#f59e0b]" />
                  Real-Time Market Research
                </h2>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={async () => {
                    toast({
                      title: "Updating Research",
                      description: "Fetching latest market insights...",
                    });
                    
                    try {
                      const assessmentText = company.assessment_points?.join(', ') || company.name;
                      const { error } = await supabase.functions.invoke('research-with-perplexity', {
                        body: { 
                          companyId: company.id,
                          assessmentText: assessmentText
                        }
                      });
                      
                      if (error) throw error;
                      
                      queryClient.invalidateQueries({ queryKey: ['company', company.id] });
                      toast({
                        title: "Research Updated",
                        description: "Latest market insights have been fetched successfully",
                      });
                    } catch (error) {
                      console.error('Error updating research:', error);
                      toast({
                        title: "Error",
                        description: "Failed to update research",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Update Research
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Research Categories - Left Column */}
                <div className="lg:col-span-1">
                  <h3 className="text-lg font-semibold text-[#f59e0b] mb-4">Research Categories</h3>
                  
                  <div className="space-y-4">
                    {/* Market Research */}
                    <Card className="border-0 shadow-subtle bg-[#1a1d2e] hover:bg-[#20243a] transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Globe className="h-5 w-5 text-[#3b82f6] flex-shrink-0 mt-1" />
                          <div>
                            <h4 className="font-semibold text-white mb-1">Market Research</h4>
                            <p className="text-sm text-gray-400">
                              Comprehensive market analysis with up-to-date insights from reputable sources.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Latest News */}
                    <Card className="border-0 shadow-subtle bg-[#1a1d2e] hover:bg-[#20243a] transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Newspaper className="h-5 w-5 text-[#10b981] flex-shrink-0 mt-1" />
                          <div>
                            <h4 className="font-semibold text-white mb-1">Latest News</h4>
                            <p className="text-sm text-gray-400">
                              Recent industry news and events with relevant implications for this company.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Market Trends */}
                    <Card className="border-2 border-[#f59e0b] shadow-subtle bg-[#1a1d2e] hover:bg-[#20243a] transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <TrendingUp className="h-5 w-5 text-[#f59e0b] flex-shrink-0 mt-1" />
                          <div>
                            <h4 className="font-semibold text-white mb-1">Market Trends</h4>
                            <p className="text-sm text-gray-400">
                              Current trends, market size data, and competitive landscape analysis.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                {/* Market Insights - Right Column */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-semibold text-[#f59e0b] mb-4">Market Insights</h3>
                  
                  <MarketResearchDisplay companyId={company.id} />
                </div>
              </div>
            </div>
          )}

          {/* For VC users, show section metrics */}
          {isVCUser && <>
              <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                Section Metrics
              </h2>
              
              {sortedSections.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {sortedSections.map(section => <SectionCard key={section.id} section={section} onClick={() => navigate(`/company/${company.id}/section/${section.id}`)} isVCAndBits={isVCAndBits} />)}
                </div> : <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>No Analysis Sections Available</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      There are no detailed analysis sections available for this company.
                    </p>
                  </CardContent>
                </Card>}
            </>}

          {/* For regular users (not VC and not IIT Bombay), show slide by slide notes */}
          {isRegularUser && company.report_id && slideNotes.length > 0 && <>
              <div className="mb-8">
                <SlideBySlideViewer reportId={company.report_id} slideNotes={slideNotes} companyName={company.name} />
              </div>
            </>}

          {/* Show section checklist for regular users */}
          {isRegularUser && filteredSections.length > 0 && <>  
              <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Section Analysis Checklist
              </h2>
              
              <div className="mb-8">
                <SectionChecklist sections={filteredSections} />
              </div>
            </>}

          {/* Show improvement suggestions for regular users */}
          {isRegularUser && <>
              <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Improvement Suggestions
              </h2>
              
              <div className="mb-8">
                <ImprovementSuggestions suggestions={improvementSuggestions} companyName={company.name} />
              </div>
            </>}
        </div>
      </div>
    </div>;
}

export default CompanyDetails;
